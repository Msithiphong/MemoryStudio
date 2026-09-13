import { and, eq, gt, isNull } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/lib/db";
import { clientMagicLinks, type ClientMagicLink, type NewClientMagicLink } from "@/lib/db/schema";

export const ClientMagicLinkRepository = {
  async create(data: NewClientMagicLink, executor: DbExecutor = getDb()): Promise<ClientMagicLink> {
    const [link] = await executor.insert(clientMagicLinks).values(data).returning();
    return link;
  },

  async findValidByHash(tokenHash: string, executor: DbExecutor = getDb()): Promise<ClientMagicLink | null> {
    const [link] = await executor
      .select()
      .from(clientMagicLinks)
      .where(
        and(
          eq(clientMagicLinks.tokenHash, tokenHash),
          isNull(clientMagicLinks.usedAt),
          isNull(clientMagicLinks.revokedAt),
          gt(clientMagicLinks.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return link ?? null;
  },

  /**
   * Atomically marks a valid link used and returns it — a single UPDATE...WHERE...RETURNING,
   * not a separate find-then-update, so two simultaneous redemption attempts on the same
   * token can't both succeed (BR-ACC-003: single-use).
   */
  async redeemIfValid(tokenHash: string, executor: DbExecutor = getDb()): Promise<ClientMagicLink | null> {
    const [link] = await executor
      .update(clientMagicLinks)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(clientMagicLinks.tokenHash, tokenHash),
          isNull(clientMagicLinks.usedAt),
          isNull(clientMagicLinks.revokedAt),
          gt(clientMagicLinks.expiresAt, new Date()),
        ),
      )
      .returning();
    return link ?? null;
  },
};
