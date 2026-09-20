import type Stripe from "stripe";

import { calculateRemainingBalanceCents, calculateRetainerCents, calculateRetainerDueCents, formatMoney } from "@/lib/money";
import { getDb, type DbExecutor } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { checkoutSessionMetadataSchema } from "@/lib/validation/payment";
import { AuditRepository } from "@/server/repositories/audit-repository";
import { BookingLineItemRepository } from "@/server/repositories/booking-line-item-repository";
import { BookingRepository } from "@/server/repositories/booking-repository";
import { ContractRepository } from "@/server/repositories/contract-repository";
import { DateReservationRepository } from "@/server/repositories/date-reservation-repository";
import { PaymentRepository } from "@/server/repositories/payment-repository";
import { StripeEventRepository } from "@/server/repositories/stripe-event-repository";
import { EmailGateway } from "@/server/gateways/email-gateway";
import { StripeGateway } from "@/server/gateways/stripe-gateway";
import { isUniqueViolation } from "@/server/services/db-errors";
import type { Booking, Payment } from "@/lib/db/schema";

/** A checkout row without a Stripe session id this old is assumed abandoned mid-creation. */
const STALE_PENDING_MS = 2 * 60 * 1000;

export type PaymentNotAllowedCode =
  | "booking_not_on_hold"
  | "hold_expired"
  | "contract_unsigned"
  | "contract_out_of_date"
  | "already_paid"
  | "checkout_in_progress";

export class PaymentNotAllowedError extends Error {
  constructor(
    readonly code: PaymentNotAllowedCode,
    message: string,
  ) {
    super(message);
    this.name = "PaymentNotAllowedError";
  }
}

export type DepositEligibility =
  | { ok: true; booking: Booking; dueCents: number; holdExpiresAt: Date }
  | { ok: false; code: PaymentNotAllowedCode; message: string };

/**
 * BR-PAY-002 in one place, shared by checkout creation (which throws) and the payment page (which renders the reason).
 * Amounts come from stored line items and payment rows only — never from the browser.
 */
export async function evaluateDepositEligibility(bookingId: string, now: Date = new Date()): Promise<DepositEligibility> {
  const booking = await BookingRepository.findById(bookingId);
  if (!booking) throw new Error("Booking not found.");

  if (booking.status !== "hold") {
    return { ok: false, code: "booking_not_on_hold", message: "This booking is not awaiting a retainer payment." };
  }

  const reservation = await DateReservationRepository.findByBookingId(booking.id);
  if (!reservation || reservation.status !== "hold" || !reservation.holdExpiresAt || reservation.holdExpiresAt <= now) {
    return {
      ok: false,
      code: "hold_expired",
      message: "The hold on your date has expired. Please contact us and we'll see if the date is still available.",
    };
  }

  const contract = await ContractRepository.findCurrentByBookingId(booking.id);
  if (!contract || contract.status !== "signed") {
    return { ok: false, code: "contract_unsigned", message: "Please sign your contract before paying the retainer." };
  }
  if (contract.bookingTotalCents !== booking.totalCents) {
    return {
      ok: false,
      code: "contract_out_of_date",
      message: "Your booking changed after the contract was prepared. We'll send an updated contract to sign.",
    };
  }

  const lineItems = await BookingLineItemRepository.listForBooking(booking.id);
  const totalCents = lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const retainerCents = calculateRetainerCents(totalCents);
  if (totalCents !== booking.totalCents || retainerCents !== booking.requiredRetainerCents) {
    throw new Error(`Booking ${booking.referenceCode} total/retainer does not match its line items.`);
  }

  const paidCents = await PaymentRepository.sumReceivedCents(booking.id, "deposit");
  const dueCents = calculateRetainerDueCents(retainerCents, paidCents);
  if (dueCents <= 0) {
    return { ok: false, code: "already_paid", message: "Your retainer has already been paid." };
  }

  return { ok: true, booking, dueCents, holdExpiresAt: reservation.holdExpiresAt };
}

/** Returns the URL of an existing still-usable Checkout Session for this attempt, or null after closing an unusable one. */
async function reuseOrCloseExistingAttempt(existing: Payment, dueCents: number): Promise<string | null> {
  if (existing.stripeCheckoutSessionId) {
    const session = await StripeGateway.retrieveCheckoutSession(existing.stripeCheckoutSessionId);
    if (session.status === "open" && session.url && existing.amountCents === dueCents) {
      return session.url;
    }
    if (session.status === "open") {
      await StripeGateway.expireCheckoutSession(existing.stripeCheckoutSessionId);
    }
    await PaymentRepository.closePending(existing.id, "cancelled");
    return null;
  }

  if (Date.now() - existing.createdAt.getTime() < STALE_PENDING_MS) {
    throw new PaymentNotAllowedError("checkout_in_progress", "Your payment page is being prepared. Please try again in a moment.");
  }
  await PaymentRepository.closePending(existing.id, "cancelled");
  return null;
}

export async function createDepositCheckoutSession(bookingId: string): Promise<{ url: string }> {
  const eligibility = await evaluateDepositEligibility(bookingId);
  if (!eligibility.ok) {
    throw new PaymentNotAllowedError(eligibility.code, eligibility.message);
  }
  const { booking, dueCents, holdExpiresAt } = eligibility;

  const existing = await PaymentRepository.findPending(booking.id, "deposit");
  if (existing) {
    const reusableUrl = await reuseOrCloseExistingAttempt(existing, dueCents);
    if (reusableUrl) return { url: reusableUrl };
  }

  let payment: Payment;
  try {
    payment = await PaymentRepository.create({
      bookingId: booking.id,
      paymentType: "deposit",
      status: "pending",
      amountCents: dueCents,
      currency: booking.currency,
    });
  } catch (error) {
    if (isUniqueViolation(error, "payments_one_pending_per_booking_type")) {
      throw new PaymentNotAllowedError("checkout_in_progress", "Your payment page is being prepared. Please try again in a moment.");
    }
    throw error;
  }

  const base = (serverEnv.APP_URL ?? "").replace(/\/$/, "");
  let session: { id: string; url: string };
  try {
    session = await StripeGateway.createDepositCheckoutSession({
      paymentId: payment.id,
      bookingId: booking.id,
      referenceCode: booking.referenceCode,
      customerEmail: booking.email,
      amountCents: dueCents,
      currency: booking.currency,
      expiresAt: StripeGateway.sessionExpiresAt(holdExpiresAt),
      successUrl: `${base}/client/payment?status=success`,
      cancelUrl: `${base}/client/payment?status=cancelled`,
    });
  } catch (error) {
    await PaymentRepository.closePending(payment.id, "failed");
    throw error;
  }

  await PaymentRepository.attachCheckoutSession(payment.id, session.id);
  await AuditRepository.record({
    actorType: "client",
    actorId: booking.id,
    bookingId: booking.id,
    action: "payment.checkout_created",
    metadataJson: { paymentId: payment.id, amountCents: dueCents },
  });

  return { url: session.url };
}

export type StripeEventOutcome =
  | { kind: "duplicate" }
  | { kind: "ignored" }
  | { kind: "recorded" }
  | { kind: "confirmed"; booking: Booking; payment: Payment }
  | { kind: "flagged"; bookingId: string; reason: string };

/**
 * Applies one verified Stripe event. The ledger insert and every state change share one transaction:
 * a duplicate delivery exits before touching anything, and a failure rolls the ledger row back so
 * Stripe's retry is processed for real.
 */
export async function applyStripePaymentEvent(event: Stripe.Event): Promise<StripeEventOutcome> {
  const outcome = await getDb().transaction(async (tx): Promise<StripeEventOutcome> => {
    const isNew = await StripeEventRepository.insertIfNew(
      { stripeEventId: event.id, eventType: event.type, apiVersion: event.api_version },
      tx,
    );
    if (!isNew) return { kind: "duplicate" };

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        return applyCheckoutPaid(event, event.data.object, tx);
      case "checkout.session.expired":
        return closeCheckoutAttempt(event, event.data.object, "cancelled", tx);
      case "checkout.session.async_payment_failed":
        return closeCheckoutAttempt(event, event.data.object, "failed", tx);
      default:
        return { kind: "ignored" };
    }
  });

  if (outcome.kind === "confirmed") {
    try {
      await sendBookingConfirmedEmail(outcome.booking, outcome.payment);
    } catch (error) {
      console.error("[applyStripePaymentEvent] Failed to send booking-confirmed email:", error);
    }
  }
  if (outcome.kind === "flagged") {
    console.error(`[applyStripePaymentEvent] Payment for booking ${outcome.bookingId} needs manual review: ${outcome.reason}`);
  }

  return outcome;
}

async function findPaymentForSession(session: Stripe.Checkout.Session, tx: DbExecutor): Promise<Payment | null> {
  const metadata = checkoutSessionMetadataSchema.safeParse(session.metadata);
  if (!metadata.success) {
    console.error(`[applyStripePaymentEvent] Checkout session ${session.id} has invalid metadata; ignoring.`);
    return null;
  }

  const payment = await PaymentRepository.findByIdForUpdate(metadata.data.paymentId, tx);
  if (!payment || payment.bookingId !== metadata.data.bookingId) {
    console.error(`[applyStripePaymentEvent] Checkout session ${session.id} references an unknown payment; ignoring.`);
    return null;
  }
  if (payment.stripeCheckoutSessionId && payment.stripeCheckoutSessionId !== session.id) {
    console.error(`[applyStripePaymentEvent] Checkout session ${session.id} does not match payment ${payment.id}; ignoring.`);
    return null;
  }
  return payment;
}

async function closeCheckoutAttempt(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  status: "cancelled" | "failed",
  tx: DbExecutor,
): Promise<StripeEventOutcome> {
  const payment = await findPaymentForSession(session, tx);
  if (!payment) return { kind: "ignored" };

  await StripeEventRepository.setBookingId(event.id, payment.bookingId, tx);
  await PaymentRepository.closePending(payment.id, status, tx);
  return { kind: "recorded" };
}

async function applyCheckoutPaid(event: Stripe.Event, session: Stripe.Checkout.Session, tx: DbExecutor): Promise<StripeEventOutcome> {
  const payment = await findPaymentForSession(session, tx);
  if (!payment) return { kind: "ignored" };

  await StripeEventRepository.setBookingId(event.id, payment.bookingId, tx);

  // A completed session that isn't actually paid yet (async methods) is settled by a later event.
  if (session.payment_status !== "paid") return { kind: "ignored" };
  if (payment.status === "paid" || payment.status === "partially_refunded" || payment.status === "refunded") {
    return { kind: "ignored" };
  }

  const receivedCents = session.amount_total ?? 0;
  if (receivedCents <= 0) {
    const reason = `Stripe reported a paid session with amount ${receivedCents}.`;
    await PaymentRepository.setManualReviewReason(payment.id, reason, tx);
    return { kind: "flagged", bookingId: payment.bookingId, reason };
  }

  const problems: string[] = [];
  if (receivedCents !== payment.amountCents || session.currency !== payment.currency) {
    problems.push(
      `Amount mismatch: expected ${payment.amountCents} ${payment.currency}, Stripe reported ${receivedCents} ${session.currency}.`,
    );
  }

  const paidAt = new Date(event.created * 1000);
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);

  // Record the money first: it arrived regardless of whether we can confirm the booking from it.
  let paid = await PaymentRepository.markPaid(
    payment.id,
    { amountCents: receivedCents, paidAt, stripePaymentIntentId: paymentIntentId, manualReviewReason: null },
    tx,
  );
  if (!paid) return { kind: "ignored" };
  if (!paid.stripeCheckoutSessionId) {
    paid = (await PaymentRepository.attachCheckoutSession(payment.id, session.id, tx)) ?? paid;
  }

  const booking = await BookingRepository.findByIdForUpdate(payment.bookingId, tx);
  if (!booking) {
    const reason = "Booking no longer exists.";
    await PaymentRepository.setManualReviewReason(payment.id, reason, tx);
    return { kind: "flagged", bookingId: payment.bookingId, reason };
  }

  const reservation = booking.status === "hold" ? await DateReservationRepository.findByBookingIdForUpdate(booking.id, tx) : null;

  if (booking.status !== "hold") {
    problems.push(`Booking is ${booking.status}, not on hold.`);
  } else if (!reservation || reservation.status !== "hold") {
    problems.push("The date reservation is missing or no longer a hold.");
  } else if (reservation.holdExpiresAt && reservation.holdExpiresAt < paidAt) {
    problems.push("The hold had expired before the payment completed.");
  }

  const contract = await ContractRepository.findCurrentByBookingId(booking.id, tx);
  if (!contract || contract.status !== "signed") {
    problems.push("The current contract is not signed.");
  } else if (contract.bookingTotalCents !== booking.totalCents) {
    problems.push("The signed contract does not match the current booking total.");
  }

  const paidDepositCents = await PaymentRepository.sumReceivedCents(booking.id, "deposit", tx);
  if (paidDepositCents < booking.requiredRetainerCents) {
    problems.push(`Retainer not fully paid: ${paidDepositCents} of ${booking.requiredRetainerCents} cents received.`);
  }

  if (problems.length > 0 || !reservation) {
    const reason = problems.join(" ") || "The date reservation could not be confirmed.";
    await PaymentRepository.setManualReviewReason(payment.id, reason, tx);
    await AuditRepository.record(
      {
        actorType: "system",
        actorId: "stripe-webhook",
        bookingId: booking.id,
        action: "payment.flagged_for_manual_review",
        metadataJson: { paymentId: payment.id, stripeEventId: event.id, reason },
      },
      tx,
    );
    return { kind: "flagged", bookingId: booking.id, reason };
  }

  await DateReservationRepository.markConfirmed(reservation.id, tx);
  const confirmed = await BookingRepository.markConfirmed(booking.id, tx);
  if (!confirmed) {
    // Cannot happen under the row lock, but never report success without the state change.
    throw new Error(`Failed to confirm booking ${booking.id}.`);
  }

  await AuditRepository.record(
    {
      actorType: "system",
      actorId: "stripe-webhook",
      bookingId: booking.id,
      action: "booking.confirmed",
      metadataJson: { paymentId: payment.id, stripeEventId: event.id, amountCents: receivedCents },
    },
    tx,
  );

  return { kind: "confirmed", booking: confirmed, payment: paid };
}

async function sendBookingConfirmedEmail(booking: Booking, payment: Payment): Promise<void> {
  await EmailGateway.sendBookingConfirmed({
    to: booking.email,
    firstName: booking.primaryContactName.split(" ")[0] ?? booking.primaryContactName,
    referenceCode: booking.referenceCode,
    eventDate: booking.eventDate,
    amountPaid: formatMoney(payment.amountCents),
    remainingBalance: formatMoney(calculateRemainingBalanceCents(booking.totalCents, payment.amountCents)),
  });
}

export type DepositSummary = {
  paidPayment: Payment | null;
  flaggedPayment: Payment | null;
};

/** Read-only view for the client payment page and admin booking page. */
export async function getDepositSummary(bookingId: string): Promise<DepositSummary> {
  const payments = await PaymentRepository.listForBooking(bookingId);
  const deposits = payments.filter((p) => p.paymentType === "deposit");
  return {
    paidPayment: deposits.find((p) => p.status === "paid" || p.status === "partially_refunded") ?? null,
    flaggedPayment: deposits.find((p) => p.manualReviewReason !== null) ?? null,
  };
}
