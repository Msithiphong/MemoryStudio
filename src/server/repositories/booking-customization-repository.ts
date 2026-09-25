import { eq } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/lib/db";
import { bookingCustomizations, type BookingCustomization, type NewBookingCustomization } from "@/lib/db/schema";

export const BookingCustomizationRepository = {
  async create(data: NewBookingCustomization, executor: DbExecutor = getDb()): Promise<BookingCustomization> {
    const [row] = await executor.insert(bookingCustomizations).values(data).returning();
    return row;
  },

  async findByBookingId(bookingId: string, executor: DbExecutor = getDb()): Promise<BookingCustomization | null> {
    const [row] = await executor.select().from(bookingCustomizations).where(eq(bookingCustomizations.bookingId, bookingId)).limit(1);
    return row ?? null;
  },

  async update(
    bookingId: string,
    data: Partial<Pick<NewBookingCustomization, "displayName1" | "displayName2" | "welcomeMessage" | "signageText" | "clientNotes" | "submittedAt">>,
    executor: DbExecutor = getDb(),
  ): Promise<BookingCustomization | null> {
    const [row] = await executor
      .update(bookingCustomizations)
      .set(data)
      .where(eq(bookingCustomizations.bookingId, bookingId))
      .returning();
    return row ?? null;
  },

  async setMaxPrompts(bookingId: string, maxPrompts: number, executor: DbExecutor = getDb()): Promise<BookingCustomization | null> {
    const [row] = await executor
      .update(bookingCustomizations)
      .set({ maxPrompts })
      .where(eq(bookingCustomizations.bookingId, bookingId))
      .returning();
    return row ?? null;
  },
};
