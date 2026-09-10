import { eq } from "drizzle-orm";

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

  async deleteById(id: string, executor: DbExecutor = getDb()): Promise<void> {
    await executor.delete(dateReservations).where(eq(dateReservations.id, id));
  },
};
