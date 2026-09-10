import { asc, eq } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/lib/db";
import { bookingLineItems, type BookingLineItem, type NewBookingLineItem } from "@/lib/db/schema";

export const BookingLineItemRepository = {
  async createMany(items: NewBookingLineItem[], executor: DbExecutor = getDb()): Promise<BookingLineItem[]> {
    if (items.length === 0) return [];
    return executor.insert(bookingLineItems).values(items).returning();
  },

  async listForBooking(bookingId: string, executor: DbExecutor = getDb()): Promise<BookingLineItem[]> {
    return executor
      .select()
      .from(bookingLineItems)
      .where(eq(bookingLineItems.bookingId, bookingId))
      .orderBy(asc(bookingLineItems.sortOrder));
  },
};
