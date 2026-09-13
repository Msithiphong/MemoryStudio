import { and, eq, gt, isNull } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/lib/db";
import { clientSessions, type ClientSession, type NewClientSession } from "@/lib/db/schema";

export const ClientSessionRepository = {
  async create(data: NewClientSession, executor: DbExecutor = getDb()): Promise<ClientSession> {
    const [session] = await executor.insert(clientSessions).values(data).returning();
    return session;
  },

  async findValidByHash(sessionHash: string, executor: DbExecutor = getDb()): Promise<ClientSession | null> {
    const [session] = await executor
      .select()
      .from(clientSessions)
      .where(
        and(
          eq(clientSessions.sessionHash, sessionHash),
          isNull(clientSessions.revokedAt),
          gt(clientSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return session ?? null;
  },

  async touch(id: string, executor: DbExecutor = getDb()): Promise<void> {
    await executor.update(clientSessions).set({ lastSeenAt: new Date() }).where(eq(clientSessions.id, id));
  },

  async revoke(id: string, executor: DbExecutor = getDb()): Promise<void> {
    await executor.update(clientSessions).set({ revokedAt: new Date() }).where(eq(clientSessions.id, id));
  },
};
