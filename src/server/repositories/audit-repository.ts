import { getDb } from "@/lib/db";
import { auditLog, type NewAuditLogEntry } from "@/lib/db/schema";

export const AuditRepository = {
  async record(entry: NewAuditLogEntry): Promise<void> {
    const db = getDb();
    await db.insert(auditLog).values(entry);
  },
};
