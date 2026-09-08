import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { adminUsers, type AdminUser } from "@/lib/db/schema";

export const AdminRepository = {
  async findBySupabaseUserId(supabaseUserId: string): Promise<AdminUser | null> {
    const db = getDb();
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.supabaseUserId, supabaseUserId)).limit(1);
    return admin ?? null;
  },
};
