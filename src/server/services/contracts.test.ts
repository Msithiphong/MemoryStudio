import { describe, expect, it, beforeAll, afterAll, afterEach } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { bookings, contracts, contractTemplates } from "@/lib/db/schema";
import { BookingRepository } from "@/server/repositories/booking-repository";
import { ContractTemplateRepository } from "@/server/repositories/contract-template-repository";
import { generateReferenceCode } from "@/lib/booking-reference";
import { getOrCreateCurrentContract, signContract, ContractAlreadySignedError } from "./contracts";

const hasDb = !!process.env.DATABASE_URL;

function futureDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

describe.skipIf(!hasDb)("contracts service", () => {
  let previousActiveId: string | null = null;
  let testTemplateId: string;
  const createdBookingIds: string[] = [];

  beforeAll(async () => {
    const db = getDb();
    const previouslyActive = await ContractTemplateRepository.findActive();
    previousActiveId = previouslyActive?.id ?? null;
    if (previouslyActive) {
      await db.update(contractTemplates).set({ isActive: false }).where(eq(contractTemplates.id, previouslyActive.id));
    }

    const testTemplate = await ContractTemplateRepository.create({
      version: `__E2E_TEST__-${Date.now()}`,
      name: "__E2E_TEST__ Template",
      sourceFormat: "plaintext",
      sourceContent:
        "Test contract for {{clientName}} on {{eventDate}}, total {{totalAmount}}, retainer {{retainerAmount}}, ref {{referenceCode}}, package {{packageName}}.",
      isActive: true,
    });
    testTemplateId = testTemplate.id;
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(contractTemplates).where(eq(contractTemplates.id, testTemplateId));
    if (previousActiveId) {
      await db.update(contractTemplates).set({ isActive: true }).where(eq(contractTemplates.id, previousActiveId));
    }
  });

  afterEach(async () => {
    const db = getDb();
    for (const bookingId of createdBookingIds) {
      await db.delete(contracts).where(eq(contracts.bookingId, bookingId));
      await db.delete(bookings).where(eq(bookings.id, bookingId));
    }
    createdBookingIds.length = 0;
  });

  async function createTestBooking() {
    const booking = await BookingRepository.create({
      referenceCode: generateReferenceCode(),
      primaryContactName: "__E2E_TEST__Client",
      email: "__e2e_contracts__@example.com",
      eventType: "wedding",
      eventDate: futureDate(200),
      status: "hold",
      subtotalCents: 69_900,
      totalCents: 69_900,
      requiredRetainerCents: 20_970,
    });
    createdBookingIds.push(booking.id);
    return booking;
  }

  it("is idempotent — a second call returns the same draft contract", async () => {
    const booking = await createTestBooking();

    const first = await getOrCreateCurrentContract(booking.id);
    const second = await getOrCreateCurrentContract(booking.id);

    expect(second.id).toBe(first.id);
    expect(first.versionNumber).toBe(1);
    expect(first.status).toBe("draft");

    const db = getDb();
    const rows = await db.select().from(contracts).where(eq(contracts.bookingId, booking.id));
    expect(rows).toHaveLength(1);
  });

  it("is race-safe under concurrent get-or-create calls", async () => {
    const booking = await createTestBooking();

    const [a, b] = await Promise.all([getOrCreateCurrentContract(booking.id), getOrCreateCurrentContract(booking.id)]);
    expect(a.id).toBe(b.id);

    const db = getDb();
    const rows = await db.select().from(contracts).where(eq(contracts.bookingId, booking.id));
    expect(rows).toHaveLength(1);
  });

  it("signs a draft exactly once (concurrent second attempt is rejected)", async () => {
    const booking = await createTestBooking();
    await getOrCreateCurrentContract(booking.id);

    const [resultA, resultB] = await Promise.allSettled([
      signContract(booking.id, { signedName: "Jamie Rivera", signedEmail: booking.email, ip: "127.0.0.1", userAgent: "vitest" }),
      signContract(booking.id, { signedName: "Jamie Rivera", signedEmail: booking.email, ip: "127.0.0.1", userAgent: "vitest" }),
    ]);

    const succeeded = [resultA, resultB].filter((r) => r.status === "fulfilled");
    const failed = [resultA, resultB].filter((r) => r.status === "rejected");
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toBeInstanceOf(ContractAlreadySignedError);
  });

  it("never changes rendered content or hash after signing", async () => {
    const booking = await createTestBooking();
    const draft = await getOrCreateCurrentContract(booking.id);

    await signContract(booking.id, { signedName: "Jamie Rivera", signedEmail: booking.email, ip: null, userAgent: null });

    const db = getDb();
    const [reloaded] = await db.select().from(contracts).where(eq(contracts.id, draft.id));
    expect(reloaded.renderedContent).toBe(draft.renderedContent);
    expect(reloaded.contentHash).toBe(draft.contentHash);
    expect(reloaded.status).toBe("signed");
  });
});
