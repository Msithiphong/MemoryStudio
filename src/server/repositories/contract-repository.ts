import { and, desc, eq, ne } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/lib/db";
import { contracts, type Contract, type NewContract } from "@/lib/db/schema";

export const ContractRepository = {
  async create(data: NewContract, executor: DbExecutor = getDb()): Promise<Contract> {
    const [contract] = await executor.insert(contracts).values(data).returning();
    return contract;
  },

  async findById(id: string, executor: DbExecutor = getDb()): Promise<Contract | null> {
    const [contract] = await executor.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    return contract ?? null;
  },

  async findCurrentByBookingId(bookingId: string, executor: DbExecutor = getDb()): Promise<Contract | null> {
    const [contract] = await executor
      .select()
      .from(contracts)
      .where(and(eq(contracts.bookingId, bookingId), ne(contracts.status, "superseded")))
      .limit(1);
    return contract ?? null;
  },

  async listForBooking(bookingId: string, executor: DbExecutor = getDb()): Promise<Contract[]> {
    return executor.select().from(contracts).where(eq(contracts.bookingId, bookingId)).orderBy(desc(contracts.versionNumber));
  },

  /**
   * Atomically marks a draft contract signed and returns it — a single UPDATE...WHERE...RETURNING,
   * not a separate find-then-update, so two simultaneous sign attempts on the same contract
   * can't both succeed (BR-CON-004: exactly one signature event per contract version).
   */
  async signIfDraft(
    id: string,
    data: { signedName: string; signedEmail: string; signedIp: string | null; signedUserAgent: string | null },
    executor: DbExecutor = getDb(),
  ): Promise<Contract | null> {
    const [contract] = await executor
      .update(contracts)
      .set({
        status: "signed",
        accepted: true,
        signedAt: new Date(),
        signedName: data.signedName,
        signedEmail: data.signedEmail,
        signedIp: data.signedIp,
        signedUserAgent: data.signedUserAgent,
      })
      .where(and(eq(contracts.id, id), eq(contracts.status, "draft")))
      .returning();
    return contract ?? null;
  },

  /** Atomically supersedes a current contract — guarded so it can't double-supersede. */
  async supersedeIfCurrent(id: string, executor: DbExecutor = getDb()): Promise<Contract | null> {
    const [contract] = await executor
      .update(contracts)
      .set({ status: "superseded", supersededAt: new Date() })
      .where(and(eq(contracts.id, id), ne(contracts.status, "superseded")))
      .returning();
    return contract ?? null;
  },
};
