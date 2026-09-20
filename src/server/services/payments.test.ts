import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { eq, inArray, like } from "drizzle-orm";
import type Stripe from "stripe";

import { getDb } from "@/lib/db";
import {
  auditLog,
  bookingLineItems,
  bookings,
  contracts,
  dateReservations,
  payments,
  stripeEvents,
  type Booking,
} from "@/lib/db/schema";
import { BookingRepository } from "@/server/repositories/booking-repository";
import { BookingLineItemRepository } from "@/server/repositories/booking-line-item-repository";
import { ContractRepository } from "@/server/repositories/contract-repository";
import { DateReservationRepository } from "@/server/repositories/date-reservation-repository";
import { PaymentRepository } from "@/server/repositories/payment-repository";
import { generateReferenceCode } from "@/lib/booking-reference";
import { hashContractContent } from "@/lib/contract-hash";

vi.mock("@/server/gateways/stripe-gateway", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/gateways/stripe-gateway")>();
  return {
    StripeGateway: {
      ...original.StripeGateway,
      createDepositCheckoutSession: vi.fn(),
      retrieveCheckoutSession: vi.fn(),
      expireCheckoutSession: vi.fn(),
    },
  };
});
vi.mock("@/server/gateways/email-gateway", () => ({
  EmailGateway: { sendBookingConfirmed: vi.fn().mockResolvedValue(undefined) },
}));

import { StripeGateway } from "@/server/gateways/stripe-gateway";
import { EmailGateway } from "@/server/gateways/email-gateway";
import { applyStripePaymentEvent, createDepositCheckoutSession, getDepositSummary, PaymentNotAllowedError } from "./payments";

const hasDb = !!process.env.DATABASE_URL;

const HOUR = 60 * 60 * 1000;
const TOTAL_CENTS = 69_900;
const RETAINER_CENTS = 20_970;

let dateCounter = 0;
function uniqueFutureDate() {
  const date = new Date();
  date.setDate(date.getDate() + 2_000 + Math.floor(Math.random() * 5_000) + dateCounter++);
  return date.toISOString().slice(0, 10);
}

describe.skipIf(!hasDb)("payments service", () => {
  const createdBookingIds: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(StripeGateway.createDepositCheckoutSession).mockImplementation(async () => ({
      id: `cs_test_${Math.random().toString(36).slice(2)}`,
      url: "https://checkout.stripe.test/pay/abc",
    }));
  });

  afterEach(async () => {
    const db = getDb();
    if (createdBookingIds.length > 0) {
      await db.delete(stripeEvents).where(inArray(stripeEvents.bookingId, createdBookingIds));
      await db.delete(payments).where(inArray(payments.bookingId, createdBookingIds));
      await db.delete(contracts).where(inArray(contracts.bookingId, createdBookingIds));
      await db.delete(dateReservations).where(inArray(dateReservations.bookingId, createdBookingIds));
      await db.delete(bookingLineItems).where(inArray(bookingLineItems.bookingId, createdBookingIds));
      await db.delete(auditLog).where(inArray(auditLog.bookingId, createdBookingIds));
      await db.delete(bookings).where(inArray(bookings.id, createdBookingIds));
      createdBookingIds.length = 0;
    }
    // Ignored events (bad metadata, unknown session, unhandled type) never get a booking id; every ledger id in this file starts with evt_test_.
    await db.delete(stripeEvents).where(like(stripeEvents.stripeEventId, "evt\\_test\\_%"));
  });

  async function createHeldBooking(options: { signed?: boolean; holdExpiresAt?: Date } = {}): Promise<Booking> {
    const { signed = true, holdExpiresAt = new Date(Date.now() + 48 * HOUR) } = options;
    const eventDate = uniqueFutureDate();

    const booking = await BookingRepository.create({
      referenceCode: generateReferenceCode(),
      primaryContactName: "__E2E_TEST__ Payer",
      email: "__e2e_payments__@example.com",
      eventType: "wedding",
      eventDate,
      status: "hold",
      subtotalCents: TOTAL_CENTS,
      totalCents: TOTAL_CENTS,
      requiredRetainerCents: RETAINER_CENTS,
    });
    createdBookingIds.push(booking.id);

    await BookingLineItemRepository.createMany([
      {
        bookingId: booking.id,
        itemType: "package",
        catalogKey: "package.signature",
        description: "Signature Package",
        quantity: 1,
        unitPriceCents: TOTAL_CENTS,
        lineTotalCents: TOTAL_CENTS,
        sortOrder: 0,
      },
    ]);
    await DateReservationRepository.create({ bookingId: booking.id, eventDate, status: "hold", holdExpiresAt });

    const content = `Contract for ${booking.referenceCode}`;
    await ContractRepository.create({
      bookingId: booking.id,
      versionNumber: 1,
      status: signed ? "signed" : "draft",
      renderedContent: content,
      contentHash: hashContractContent(content),
      bookingTotalCents: TOTAL_CENTS,
      currency: "usd",
      ...(signed
        ? { accepted: true, signedAt: new Date(), signedName: "Test Payer", signedEmail: booking.email }
        : {}),
    });

    return booking;
  }

  let eventCounter = 0;
  function checkoutEvent(
    payment: { id: string; bookingId: string; stripeCheckoutSessionId: string | null },
    overrides: {
      eventId?: string;
      type?: string;
      amountTotal?: number;
      currency?: string;
      paymentStatus?: string;
      createdAt?: Date;
      metadata?: Record<string, string> | null;
    } = {},
  ): Stripe.Event {
    return {
      id: overrides.eventId ?? `evt_test_${Date.now()}_${eventCounter++}`,
      object: "event",
      type: overrides.type ?? "checkout.session.completed",
      api_version: "2026-08-26.dahlia",
      created: Math.floor((overrides.createdAt ?? new Date()).getTime() / 1000),
      data: {
        object: {
          id: payment.stripeCheckoutSessionId,
          object: "checkout.session",
          amount_total: overrides.amountTotal ?? RETAINER_CENTS,
          currency: overrides.currency ?? "usd",
          payment_status: overrides.paymentStatus ?? "paid",
          payment_intent: `pi_test_${payment.id}`,
          metadata:
            overrides.metadata === undefined
              ? { paymentId: payment.id, bookingId: payment.bookingId, paymentType: "deposit" }
              : overrides.metadata,
        },
      },
    } as unknown as Stripe.Event;
  }

  /** Runs the real checkout-creation path against the mocked gateway and returns the resulting pending payment. */
  async function startCheckout(booking: Booking) {
    await createDepositCheckoutSession(booking.id);
    const payment = await PaymentRepository.findPending(booking.id, "deposit");
    expect(payment).not.toBeNull();
    return payment!;
  }

  describe("createDepositCheckoutSession", () => {
    it("charges 30% of the stored total, with internal ids in the metadata", async () => {
      const booking = await createHeldBooking();
      const payment = await startCheckout(booking);

      expect(payment.amountCents).toBe(RETAINER_CENTS);
      expect(payment.status).toBe("pending");
      expect(payment.stripeCheckoutSessionId).toMatch(/^cs_test_/);

      const args = vi.mocked(StripeGateway.createDepositCheckoutSession).mock.calls[0][0];
      expect(args.amountCents).toBe(RETAINER_CENTS);
      expect(args.paymentId).toBe(payment.id);
      expect(args.bookingId).toBe(booking.id);
    });

    it("cannot create a session before the current contract is signed", async () => {
      const booking = await createHeldBooking({ signed: false });

      await expect(createDepositCheckoutSession(booking.id)).rejects.toMatchObject({ code: "contract_unsigned" });
      expect(StripeGateway.createDepositCheckoutSession).not.toHaveBeenCalled();
      expect(await PaymentRepository.listForBooking(booking.id)).toHaveLength(0);
    });

    it("cannot create a session after the hold has expired", async () => {
      const booking = await createHeldBooking({ holdExpiresAt: new Date(Date.now() - HOUR) });

      await expect(createDepositCheckoutSession(booking.id)).rejects.toMatchObject({ code: "hold_expired" });
      expect(StripeGateway.createDepositCheckoutSession).not.toHaveBeenCalled();
    });

    it("cannot create a session for a booking that is not on hold", async () => {
      const booking = await createHeldBooking();
      await getDb().update(bookings).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(bookings.id, booking.id));

      await expect(createDepositCheckoutSession(booking.id)).rejects.toBeInstanceOf(PaymentNotAllowedError);
      expect(StripeGateway.createDepositCheckoutSession).not.toHaveBeenCalled();
    });

    it("reuses a still-open Checkout Session instead of creating a second payment", async () => {
      const booking = await createHeldBooking();
      const first = await startCheckout(booking);
      vi.mocked(StripeGateway.retrieveCheckoutSession).mockResolvedValue({
        id: first.stripeCheckoutSessionId,
        status: "open",
        url: "https://checkout.stripe.test/pay/abc",
      } as unknown as Stripe.Checkout.Session);

      const second = await createDepositCheckoutSession(booking.id);

      expect(second.url).toBe("https://checkout.stripe.test/pay/abc");
      expect(StripeGateway.createDepositCheckoutSession).toHaveBeenCalledTimes(1);
      expect(await PaymentRepository.listForBooking(booking.id)).toHaveLength(1);
    });

    it("replaces an expired Checkout Session with a fresh attempt", async () => {
      const booking = await createHeldBooking();
      const first = await startCheckout(booking);
      vi.mocked(StripeGateway.retrieveCheckoutSession).mockResolvedValue({
        id: first.stripeCheckoutSessionId,
        status: "expired",
        url: null,
      } as unknown as Stripe.Checkout.Session);

      await createDepositCheckoutSession(booking.id);

      const all = await PaymentRepository.listForBooking(booking.id);
      expect(all).toHaveLength(2);
      expect(all.filter((p) => p.status === "cancelled")).toHaveLength(1);
      expect(all.filter((p) => p.status === "pending")).toHaveLength(1);
    });

    it("marks the attempt failed if Stripe rejects session creation", async () => {
      const booking = await createHeldBooking();
      vi.mocked(StripeGateway.createDepositCheckoutSession).mockRejectedValue(new Error("stripe down"));

      await expect(createDepositCheckoutSession(booking.id)).rejects.toThrow("stripe down");

      const all = await PaymentRepository.listForBooking(booking.id);
      expect(all).toHaveLength(1);
      expect(all[0].status).toBe("failed");
    });
  });

  describe("applyStripePaymentEvent", () => {
    it("does not confirm anything until a verified webhook arrives (success redirect alone is not enough)", async () => {
      const booking = await createHeldBooking();
      const payment = await startCheckout(booking);

      // The client returning from Stripe touches no service function that changes payment state.
      expect((await BookingRepository.findById(booking.id))?.status).toBe("hold");
      expect((await PaymentRepository.findById(payment.id))?.status).toBe("pending");
      expect((await getDepositSummary(booking.id)).paidPayment).toBeNull();
    });

    it("records the payment and confirms the booking and reservation", async () => {
      const booking = await createHeldBooking();
      const payment = await startCheckout(booking);

      const outcome = await applyStripePaymentEvent(checkoutEvent(payment));

      expect(outcome.kind).toBe("confirmed");
      const after = await BookingRepository.findById(booking.id);
      expect(after?.status).toBe("confirmed");
      expect(after?.confirmedAt).not.toBeNull();
      const reservation = await DateReservationRepository.findByBookingId(booking.id);
      expect(reservation?.status).toBe("confirmed");
      expect(reservation?.holdExpiresAt).toBeNull();
      const paid = await PaymentRepository.findById(payment.id);
      expect(paid?.status).toBe("paid");
      expect(paid?.amountCents).toBe(RETAINER_CENTS);
      expect(paid?.manualReviewReason).toBeNull();
      expect(EmailGateway.sendBookingConfirmed).toHaveBeenCalledTimes(1);
    });

    it("processes a redelivered event exactly once", async () => {
      const booking = await createHeldBooking();
      const payment = await startCheckout(booking);
      const event = checkoutEvent(payment);

      const first = await applyStripePaymentEvent(event);
      const second = await applyStripePaymentEvent(event);

      expect(first.kind).toBe("confirmed");
      expect(second.kind).toBe("duplicate");
      expect(await PaymentRepository.sumReceivedCents(booking.id, "deposit")).toBe(RETAINER_CENTS);
      expect(EmailGateway.sendBookingConfirmed).toHaveBeenCalledTimes(1);
    });

    it("handles simultaneous duplicate deliveries without double-paying", async () => {
      const booking = await createHeldBooking();
      const payment = await startCheckout(booking);
      const event = checkoutEvent(payment);

      const outcomes = await Promise.all([applyStripePaymentEvent(event), applyStripePaymentEvent(event)]);

      expect(outcomes.map((o) => o.kind).sort()).toEqual(["confirmed", "duplicate"]);
      expect(await PaymentRepository.sumReceivedCents(booking.id, "deposit")).toBe(RETAINER_CENTS);
      expect(EmailGateway.sendBookingConfirmed).toHaveBeenCalledTimes(1);
    });

    it("ignores a second event for a payment that is already recorded as paid", async () => {
      const booking = await createHeldBooking();
      const payment = await startCheckout(booking);

      await applyStripePaymentEvent(checkoutEvent(payment));
      const later = await applyStripePaymentEvent(checkoutEvent(payment, { type: "checkout.session.async_payment_succeeded" }));

      expect(later.kind).toBe("ignored");
      expect(await PaymentRepository.sumReceivedCents(booking.id, "deposit")).toBe(RETAINER_CENTS);
    });

    it("flags a wrong amount for manual review instead of confirming", async () => {
      const booking = await createHeldBooking();
      const payment = await startCheckout(booking);

      const outcome = await applyStripePaymentEvent(checkoutEvent(payment, { amountTotal: RETAINER_CENTS - 500 }));

      expect(outcome.kind).toBe("flagged");
      expect((await BookingRepository.findById(booking.id))?.status).toBe("hold");
      expect((await DateReservationRepository.findByBookingId(booking.id))?.status).toBe("hold");
      const recorded = await PaymentRepository.findById(payment.id);
      expect(recorded?.status).toBe("paid"); // the money did arrive
      expect(recorded?.amountCents).toBe(RETAINER_CENTS - 500);
      expect(recorded?.manualReviewReason).toMatch(/Amount mismatch/);
      expect(EmailGateway.sendBookingConfirmed).not.toHaveBeenCalled();
    });

    it("flags a payment whose hold already lapsed and was released", async () => {
      const booking = await createHeldBooking();
      const payment = await startCheckout(booking);
      const reservation = await DateReservationRepository.findByBookingId(booking.id);
      await BookingRepository.markExpired(booking.id);
      await DateReservationRepository.deleteById(reservation!.id);

      const outcome = await applyStripePaymentEvent(checkoutEvent(payment));

      expect(outcome.kind).toBe("flagged");
      const after = await BookingRepository.findById(booking.id);
      expect(after?.status).toBe("expired");
      expect((await PaymentRepository.findById(payment.id))?.manualReviewReason).toMatch(/not on hold/);
      expect((await getDepositSummary(booking.id)).flaggedPayment?.id).toBe(payment.id);
    });

    it("flags a payment that completed after the hold's expiry time even if the row still exists", async () => {
      const booking = await createHeldBooking({ holdExpiresAt: new Date(Date.now() + HOUR) });
      const payment = await startCheckout(booking);

      const outcome = await applyStripePaymentEvent(checkoutEvent(payment, { createdAt: new Date(Date.now() + 2 * HOUR) }));

      expect(outcome.kind).toBe("flagged");
      expect((await BookingRepository.findById(booking.id))?.status).toBe("hold");
    });

    it("flags a payment when the contract is no longer signed", async () => {
      const booking = await createHeldBooking();
      const payment = await startCheckout(booking);
      await getDb().delete(contracts).where(eq(contracts.bookingId, booking.id));

      const outcome = await applyStripePaymentEvent(checkoutEvent(payment));

      expect(outcome.kind).toBe("flagged");
      expect((await BookingRepository.findById(booking.id))?.status).toBe("hold");
    });

    it("ignores events whose metadata is not a valid internal identifier", async () => {
      const booking = await createHeldBooking();
      const payment = await startCheckout(booking);

      const outcome = await applyStripePaymentEvent(
        checkoutEvent(payment, { metadata: { paymentId: "not-a-uuid", bookingId: booking.id, paymentType: "deposit" } }),
      );

      expect(outcome.kind).toBe("ignored");
      expect((await PaymentRepository.findById(payment.id))?.status).toBe("pending");
      expect((await BookingRepository.findById(booking.id))?.status).toBe("hold");
    });

    it("ignores a paid event whose session does not match the payment's session", async () => {
      const booking = await createHeldBooking();
      const payment = await startCheckout(booking);

      const outcome = await applyStripePaymentEvent(checkoutEvent({ ...payment, stripeCheckoutSessionId: "cs_test_someone_else" }));

      expect(outcome.kind).toBe("ignored");
      expect((await BookingRepository.findById(booking.id))?.status).toBe("hold");
    });

    it("cancels the pending attempt when Stripe reports the session expired", async () => {
      const booking = await createHeldBooking();
      const payment = await startCheckout(booking);

      const outcome = await applyStripePaymentEvent(checkoutEvent(payment, { type: "checkout.session.expired", paymentStatus: "unpaid" }));

      expect(outcome.kind).toBe("recorded");
      expect((await PaymentRepository.findById(payment.id))?.status).toBe("cancelled");
      expect((await BookingRepository.findById(booking.id))?.status).toBe("hold");
    });

    it("ignores an unpaid completed session (waiting on an async settlement event)", async () => {
      const booking = await createHeldBooking();
      const payment = await startCheckout(booking);

      const outcome = await applyStripePaymentEvent(checkoutEvent(payment, { paymentStatus: "unpaid" }));

      expect(outcome.kind).toBe("ignored");
      expect((await PaymentRepository.findById(payment.id))?.status).toBe("pending");
    });

    it("records but otherwise ignores event types it does not handle", async () => {
      const outcome = await applyStripePaymentEvent({
        id: `evt_test_unhandled_${Date.now()}`,
        object: "event",
        type: "__e2e_test__",
        api_version: "2026-08-26.dahlia",
        created: Math.floor(Date.now() / 1000),
        data: { object: {} },
      } as unknown as Stripe.Event);

      expect(outcome.kind).toBe("ignored");
    });
  });
});
