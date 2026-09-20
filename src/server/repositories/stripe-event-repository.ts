import { eq } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/lib/db";
import { stripeEvents, type NewStripeEvent } from "@/lib/db/schema";

export const StripeEventRepository = {
  /**
   * The idempotency gate. Returns true if this call inserted the event row (first delivery),
   * false if it already existed (duplicate delivery — the caller must not re-run side effects).
   * Call inside the same transaction as the business mutation so a failed mutation also
   * rolls back the ledger row and Stripe's retry gets a fresh attempt.
   */
  async insertIfNew(data: NewStripeEvent, executor: DbExecutor = getDb()): Promise<boolean> {
    const inserted = await executor
      .insert(stripeEvents)
      .values(data)
      .onConflictDoNothing({ target: stripeEvents.stripeEventId })
      .returning({ id: stripeEvents.stripeEventId });
    return inserted.length > 0;
  },

  async setBookingId(stripeEventId: string, bookingId: string, executor: DbExecutor = getDb()): Promise<void> {
    await executor.update(stripeEvents).set({ bookingId }).where(eq(stripeEvents.stripeEventId, stripeEventId));
  },
};
