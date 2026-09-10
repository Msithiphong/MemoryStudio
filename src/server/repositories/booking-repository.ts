import { eq } from "drizzle-orm";

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

  async markExpired(id: string, executor: DbExecutor = getDb()): Promise<Booking | null> {
    const [booking] = await executor
      .update(bookings)
      .set({ status: "expired", expiredAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking ?? null;
  },
};
