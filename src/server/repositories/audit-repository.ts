import { getDb, type DbExecutor } from "@/lib/db";
import { auditLog, type NewAuditLogEntry } from "@/lib/db/schema";

export const AuditRepository = {
  async record(entry: NewAuditLogEntry, executor: DbExecutor = getDb()): Promise<void> {
    await executor.insert(auditLog).values(entry);
  },
};
