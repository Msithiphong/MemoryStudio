import { and, desc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/lib/db";
import { bookings, type Booking, type NewBooking } from "@/lib/db/schema";

export const BookingRepository = {
  async create(data: NewBooking, executor: DbExecutor = getDb()): Promise<Booking> {
    const [booking] = await executor.insert(bookings).values(data).returning();
    return booking;
  },

  async findById(id: string, executor: DbExecutor = getDb()): Promise<Booking | null> {
    const [booking] = await executor.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    return booking ?? null;
  },

  /** Row-locks the booking for the rest of the transaction. */
  async findByIdForUpdate(id: string, executor: DbExecutor): Promise<Booking | null> {
    const [booking] = await executor.select().from(bookings).where(eq(bookings.id, id)).for("update").limit(1);
    return booking ?? null;
  },

  async markConfirmed(id: string, executor: DbExecutor = getDb()): Promise<Booking | null> {
    const [booking] = await executor
      .update(bookings)
      .set({ status: "confirmed", confirmedAt: new Date() })
      .where(and(eq(bookings.id, id), eq(bookings.status, "hold")))
      .returning();
    return booking ?? null;
  },

  async findActiveByEmail(email: string, executor: DbExecutor = getDb()): Promise<Booking | null> {
    const [booking] = await executor
      .select()
      .from(bookings)
      .where(and(eq(sql`lower(${bookings.email})`, email.toLowerCase()), ne(bookings.status, "cancelled")))
      .orderBy(desc(bookings.createdAt))
      .limit(1);
    return booking ?? null;
  },

  async markExpired(id: string, executor: DbExecutor = getDb()): Promise<Booking | null> {
    const [booking] = await executor
      .update(bookings)
      .set({ status: "expired", expiredAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking ?? null;
  },

  async setCustomizationDueAt(id: string, dueAt: Date | null, executor: DbExecutor = getDb()): Promise<Booking | null> {
    const [booking] = await executor.update(bookings).set({ customizationDueAt: dueAt }).where(eq(bookings.id, id)).returning();
    return booking ?? null;
  },

  /** BR-PAY-012: no default/derived value — an admin sets this per booking, or leaves it null. Never auto-enforced. */
  async setBalanceDueAt(id: string, dueAt: Date | null, executor: DbExecutor = getDb()): Promise<Booking | null> {
    const [booking] = await executor.update(bookings).set({ balanceDueAt: dueAt }).where(eq(bookings.id, id)).returning();
    return booking ?? null;
  },

  /** Atomic and idempotent-safe: returns null (a no-op, not an error) if already locked. */
  async lockCustomization(id: string, executor: DbExecutor = getDb()): Promise<Booking | null> {
    const [booking] = await executor
      .update(bookings)
      .set({ customizationLockedAt: new Date() })
      .where(and(eq(bookings.id, id), isNull(bookings.customizationLockedAt)))
      .returning();
    return booking ?? null;
  },

  /** Atomic and idempotent-safe: returns null (a no-op, not an error) if already unlocked. */
  async unlockCustomization(id: string, executor: DbExecutor = getDb()): Promise<Booking | null> {
    const [booking] = await executor
      .update(bookings)
      .set({ customizationLockedAt: null })
      .where(and(eq(bookings.id, id), isNotNull(bookings.customizationLockedAt)))
      .returning();
    return booking ?? null;
  },
};
