import { getDb } from "@/lib/db";
import { BookingRepository } from "@/server/repositories/booking-repository";
import { BookingLineItemRepository } from "@/server/repositories/booking-line-item-repository";
import { DateReservationRepository } from "@/server/repositories/date-reservation-repository";
import { InquiryRepository } from "@/server/repositories/inquiry-repository";
import { AuditRepository } from "@/server/repositories/audit-repository";
import { EmailGateway } from "@/server/gateways/email-gateway";
import { sendAccessLink } from "@/server/services/client-access";
import { generateReferenceCode } from "@/lib/booking-reference";
import type { LineItemInput } from "@/lib/validation/booking";
import type { Booking, BookingLineItem, DateReservation } from "@/lib/db/schema";

const HOLD_DURATION_HOURS = 72; // BR-AVL-005 recommended default — TBD before launch
const MAX_REFERENCE_CODE_ATTEMPTS = 5;

function isUniqueViolation(error: unknown, constraintName: string): boolean {
  // Drizzle wraps postgres.js's raw PostgresError in its own error, with the real
  // Postgres fields (code, constraint_name) on `.cause`, not on the thrown error itself.
  const cause = error instanceof Error && error.cause ? error.cause : error;
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    (cause as { code?: string }).code === "23505" &&
    "constraint_name" in cause &&
    (cause as { constraint_name?: string }).constraint_name === constraintName
  );
}

export class DateAlreadyHeldError extends Error {
  constructor() {
    super("That date is already held or booked. Someone else may have just approved it.");
    this.name = "DateAlreadyHeldError";
  }
}

export async function approveInquiry(
  inquiryId: string,
  input: { lineItems: LineItemInput[]; actor: { id: string; displayName: string } },
): Promise<Booking> {
  const packageItems = input.lineItems.filter((i) => i.itemType === "package");
  if (packageItems.length !== 1) {
    throw new Error("Choose exactly one package.");
  }

  const db = getDb();

  for (let attempt = 1; attempt <= MAX_REFERENCE_CODE_ATTEMPTS; attempt++) {
    try {
      const booking = await db.transaction(async (tx) => {
        const inquiry = await InquiryRepository.findById(inquiryId, tx);
        if (!inquiry) {
          throw new Error("Inquiry not found.");
        }
        if (inquiry.status === "converted") {
          throw new Error("This inquiry has already been converted to a booking.");
        }

        // BR-AVL-007: release a stale hold on this date before attempting a new one.
        const existingReservation = await DateReservationRepository.findByEventDate(inquiry.eventDate, tx);
        if (existingReservation && existingReservation.status === "hold") {
          const expired = existingReservation.holdExpiresAt && existingReservation.holdExpiresAt < new Date();
          if (expired) {
            await BookingRepository.markExpired(existingReservation.bookingId, tx);
            await DateReservationRepository.deleteById(existingReservation.id, tx);
          }
        }

        const lineItemsWithTotals = input.lineItems.map((item) => ({
          itemType: item.itemType,
          catalogKey: item.catalogKey || null,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          lineTotalCents: item.quantity * item.unitPriceCents,
        }));
        const totalCents = lineItemsWithTotals.reduce((sum, item) => sum + item.lineTotalCents, 0);
        const requiredRetainerCents = Math.round(totalCents * 0.3);

        const created = await BookingRepository.create(
          {
            inquiryId: inquiry.id,
            referenceCode: generateReferenceCode(),
            primaryContactName: [inquiry.firstName, inquiry.lastName].filter(Boolean).join(" "),
            partnerName: [inquiry.partnerFirstName, inquiry.partnerLastName].filter(Boolean).join(" ") || null,
            email: inquiry.email,
            phone: inquiry.phone,
            eventType: inquiry.eventType,
            eventDate: inquiry.eventDate,
            venueName: inquiry.venueName,
            venueCity: inquiry.venueCity,
            venueState: inquiry.venueState,
            status: "hold",
            subtotalCents: totalCents,
            totalCents,
            requiredRetainerCents,
          },
          tx,
        );

        await BookingLineItemRepository.createMany(
          lineItemsWithTotals.map((item, index) => ({ ...item, bookingId: created.id, sortOrder: index })),
          tx,
        );

        const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_HOURS * 60 * 60 * 1000);
        await DateReservationRepository.create(
          { bookingId: created.id, eventDate: created.eventDate, status: "hold", holdExpiresAt },
          tx,
        );

        await InquiryRepository.updateStatus(inquiry.id, "converted", tx);

        await AuditRepository.record({
          actorType: "admin",
          actorId: input.actor.id,
          actorDisplayName: input.actor.displayName,
          inquiryId: inquiry.id,
          bookingId: created.id,
          action: "inquiry.approved",
          metadataJson: { totalCents, requiredRetainerCents, referenceCode: created.referenceCode },
        });

        return created;
      });

      try {
        await EmailGateway.sendBookingHold({
          to: booking.email,
          firstName: booking.primaryContactName,
          eventDate: booking.eventDate,
          referenceCode: booking.referenceCode,
        });
      } catch (error) {
        console.error("[approveInquiry] Failed to send booking-hold email:", error);
      }

      try {
        await sendAccessLink(booking);
      } catch (error) {
        console.error("[approveInquiry] Failed to send client access link:", error);
      }

      return booking;
    } catch (error) {
      if (isUniqueViolation(error, "date_reservations_event_date_unique")) {
        throw new DateAlreadyHeldError();
      }
      if (isUniqueViolation(error, "bookings_reference_code_unique") && attempt < MAX_REFERENCE_CODE_ATTEMPTS) {
        continue; // exceedingly unlikely, but retry with a freshly generated code per DATABASE.md's guidance
      }
      throw error;
    }
  }

  throw new Error("Could not generate a unique booking reference. Please try again.");
}

export async function getBooking(
  id: string,
): Promise<{ booking: Booking; lineItems: BookingLineItem[]; reservation: DateReservation | null } | null> {
  let booking = await BookingRepository.findById(id);
  if (!booking) return null;

  let reservation = await DateReservationRepository.findByBookingId(booking.id);

  // Lazily surface an expired hold immediately, rather than waiting for the next approval attempt on this date.
  if (booking.status === "hold" && reservation?.holdExpiresAt && reservation.holdExpiresAt < new Date()) {
    const updated = await BookingRepository.markExpired(booking.id);
    await DateReservationRepository.deleteById(reservation.id);
    if (updated) booking = updated;
    reservation = null;
  }

  const lineItems = await BookingLineItemRepository.listForBooking(booking.id);
  return { booking, lineItems, reservation };
}
