import { describe, expect, it, afterEach } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { bookings, clientMagicLinks, clientSessions } from "@/lib/db/schema";
import { BookingRepository } from "@/server/repositories/booking-repository";
import { ClientMagicLinkRepository } from "@/server/repositories/client-magic-link-repository";
import { generateReferenceCode } from "@/lib/booking-reference";
import { hashToken } from "@/lib/client-token";
import { requestClientAccess, redeemMagicLink, InvalidMagicLinkError } from "./client-access";

const hasDb = !!process.env.DATABASE_URL;

function futureDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

describe.skipIf(!hasDb)("client access — request, redeem, and single-use", () => {
  const createdBookingIds: string[] = [];

  afterEach(async () => {
    const db = getDb();
    for (const bookingId of createdBookingIds) {
      await db.delete(clientSessions).where(eq(clientSessions.bookingId, bookingId));
      await db.delete(clientMagicLinks).where(eq(clientMagicLinks.bookingId, bookingId));
      await db.delete(bookings).where(eq(bookings.id, bookingId));
    }
    createdBookingIds.length = 0;
  });

  async function createTestBooking(overrides: Partial<Parameters<typeof BookingRepository.create>[0]> = {}) {
    const booking = await BookingRepository.create({
      referenceCode: generateReferenceCode(),
      primaryContactName: "__E2E_TEST__Client",
      email: "__e2e_client_access__@example.com",
      eventType: "wedding",
      eventDate: futureDate(200),
      status: "hold",
      subtotalCents: 69_900,
      totalCents: 69_900,
      requiredRetainerCents: 20_970,
      ...overrides,
    });
    createdBookingIds.push(booking.id);
    return booking;
  }

  it("finds an active booking by email and creates a link; redeeming it creates a session", async () => {
    const booking = await createTestBooking();

    await requestClientAccess(booking.email);

    const db = getDb();
    const links = await db.select().from(clientMagicLinks).where(eq(clientMagicLinks.bookingId, booking.id));
    expect(links).toHaveLength(1);
    expect(links[0].usedAt).toBeNull();
  });

  it("redeems a valid token exactly once (BR-ACC-003)", async () => {
    const booking = await createTestBooking();
    const rawToken = "a".repeat(64); // synthetic raw token for a deterministic test
    await ClientMagicLinkRepository.create({
      bookingId: booking.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await redeemMagicLink(rawToken);
    expect(result.bookingId).toBe(booking.id);

    await expect(redeemMagicLink(rawToken)).rejects.toBeInstanceOf(InvalidMagicLinkError);
  });

  it("rejects an expired token", async () => {
    // The DB enforces expires_at > created_at, so we can't insert an already-expired
    // row directly — insert one that expires almost immediately, then wait for it to lapse.
    const booking = await createTestBooking();
    const rawToken = "b".repeat(64);
    await ClientMagicLinkRepository.create({
      bookingId: booking.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 500),
    });

    await new Promise((resolve) => setTimeout(resolve, 700));

    await expect(redeemMagicLink(rawToken)).rejects.toBeInstanceOf(InvalidMagicLinkError);
  }, 10_000);

  it("does not create a link for a cancelled booking's email", async () => {
    const booking = await createTestBooking({
      email: "__e2e_client_access_cancelled__@example.com",
      status: "cancelled",
      cancelledAt: new Date(),
    });

    await requestClientAccess(booking.email);

    const db = getDb();
    const links = await db.select().from(clientMagicLinks).where(eq(clientMagicLinks.bookingId, booking.id));
    expect(links).toHaveLength(0);
  });
});
