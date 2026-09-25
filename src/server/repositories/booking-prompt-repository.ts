import { asc, eq } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/lib/db";
import { bookingPrompts, type BookingPrompt } from "@/lib/db/schema";

export const BookingPromptRepository = {
  async listForBooking(bookingId: string, executor: DbExecutor = getDb()): Promise<BookingPrompt[]> {
    return executor.select().from(bookingPrompts).where(eq(bookingPrompts.bookingId, bookingId)).orderBy(asc(bookingPrompts.sortOrder));
  },

  /** Wholesale replace — simpler and safe under the (booking_id, sort_order) unique constraint than diffing an ordered list. */
  async replaceForBooking(bookingId: string, promptTexts: string[], executor: DbExecutor = getDb()): Promise<BookingPrompt[]> {
    await executor.delete(bookingPrompts).where(eq(bookingPrompts.bookingId, bookingId));
    if (promptTexts.length === 0) return [];
    return executor
      .insert(bookingPrompts)
      .values(promptTexts.map((promptText, index) => ({ bookingId, promptText, sortOrder: index })))
      .returning();
  },
};
