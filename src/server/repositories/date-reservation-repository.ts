import { and, eq } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/lib/db";
import { dateReservations, type DateReservation, type NewDateReservation } from "@/lib/db/schema";

export const DateReservationRepository = {
  async create(data: NewDateReservation, executor: DbExecutor = getDb()): Promise<DateReservation> {
    const [reservation] = await executor.insert(dateReservations).values(data).returning();
    return reservation;
  },

  async findByEventDate(eventDate: string, executor: DbExecutor = getDb()): Promise<DateReservation | null> {
    const [reservation] = await executor
      .select()
      .from(dateReservations)
      .where(eq(dateReservations.eventDate, eventDate))
      .limit(1);
    return reservation ?? null;
  },

  async findByBookingId(bookingId: string, executor: DbExecutor = getDb()): Promise<DateReservation | null> {
    const [reservation] = await executor
      .select()
      .from(dateReservations)
      .where(eq(dateReservations.bookingId, bookingId))
      .limit(1);
    return reservation ?? null;
  },

  /** Row-locks the reservation for the rest of the transaction. */
  async findByBookingIdForUpdate(bookingId: string, executor: DbExecutor): Promise<DateReservation | null> {
    const [reservation] = await executor
      .select()
      .from(dateReservations)
      .where(eq(dateReservations.bookingId, bookingId))
      .for("update")
      .limit(1);
    return reservation ?? null;
  },

  async markConfirmed(id: string, executor: DbExecutor = getDb()): Promise<DateReservation | null> {
    const [reservation] = await executor
      .update(dateReservations)
      .set({ status: "confirmed", holdExpiresAt: null, confirmedAt: new Date() })
      .where(and(eq(dateReservations.id, id), eq(dateReservations.status, "hold")))
      .returning();
    return reservation ?? null;
  },

  async deleteById(id: string, executor: DbExecutor = getDb()): Promise<void> {
    await executor.delete(dateReservations).where(eq(dateReservations.id, id));
  },
};
