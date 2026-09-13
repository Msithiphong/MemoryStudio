import { describe, expect, it, afterEach } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { inquiries, dateReservations, bookingLineItems, bookings, auditLog, clientMagicLinks, clientSessions } from "@/lib/db/schema";
import { InquiryRepository } from "@/server/repositories/inquiry-repository";
import { approveInquiry, DateAlreadyHeldError } from "./bookings";

const hasDb = !!process.env.DATABASE_URL;

function futureDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

const testActor = { id: "test-admin-id", displayName: "Test Admin" };

function packageLineItem() {
  return [
    {
      itemType: "package" as const,
      description: "Test Package",
      quantity: 1,
      unitPriceCents: 69_900,
    },
  ];
}

describe.skipIf(!hasDb)("approveInquiry — concurrent date holds", () => {
  const createdInquiryIds: string[] = [];
  const createdBookingIds: string[] = [];

  afterEach(async () => {
    const db = getDb();
    for (const bookingId of createdBookingIds) {
      await db.delete(clientSessions).where(eq(clientSessions.bookingId, bookingId));
      await db.delete(clientMagicLinks).where(eq(clientMagicLinks.bookingId, bookingId));
      await db.delete(dateReservations).where(eq(dateReservations.bookingId, bookingId));
      await db.delete(bookingLineItems).where(eq(bookingLineItems.bookingId, bookingId));
      await db.delete(auditLog).where(eq(auditLog.bookingId, bookingId));
      await db.delete(bookings).where(eq(bookings.id, bookingId));
    }
    for (const inquiryId of createdInquiryIds) {
      await db.delete(auditLog).where(eq(auditLog.inquiryId, inquiryId));
      await db.delete(inquiries).where(eq(inquiries.id, inquiryId));
    }
    createdInquiryIds.length = 0;
    createdBookingIds.length = 0;
  });

  it("allows only one of two concurrent approvals for the same date to succeed", async () => {
    const eventDate = futureDate(180 + Math.floor(Math.random() * 1000)); // unlikely to collide with real data

    const inquiryA = await InquiryRepository.create({
      firstName: "__E2E_TEST__A",
      email: "__e2e_concurrent_a__@example.com",
      eventType: "wedding",
      eventDate,
    });
    const inquiryB = await InquiryRepository.create({
      firstName: "__E2E_TEST__B",
      email: "__e2e_concurrent_b__@example.com",
      eventType: "wedding",
      eventDate,
    });
    createdInquiryIds.push(inquiryA.id, inquiryB.id);

    const [resultA, resultB] = await Promise.allSettled([
      approveInquiry(inquiryA.id, { lineItems: packageLineItem(), actor: testActor }),
      approveInquiry(inquiryB.id, { lineItems: packageLineItem(), actor: testActor }),
    ]);

    const succeeded = [resultA, resultB].filter((r) => r.status === "fulfilled");
    const failed = [resultA, resultB].filter((r) => r.status === "rejected");

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toBeInstanceOf(DateAlreadyHeldError);

    if (succeeded[0]?.status === "fulfilled") {
      createdBookingIds.push(succeeded[0].value.id);
    }

    const db = getDb();
    const reservationRows = await db.select().from(dateReservations).where(eq(dateReservations.eventDate, eventDate));
    expect(reservationRows).toHaveLength(1);
  }, 20_000);
});
