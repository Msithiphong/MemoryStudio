import { createClient } from "@/lib/supabase/server";
import { AdminRepository } from "@/server/repositories/admin-repository";
import { publicEnv } from "@/lib/env";
import type { AdminUser } from "@/lib/db/schema";

/**
 * The single authorization choke point for the admin area. An authenticated Supabase
 * user is not automatically an authorized Memory Studio admin (BR-ADM-003) — this
 * checks the admin_users allowlist and returns null unless the record is active.
 */
export async function getCurrentAdmin(): Promise<{ admin: AdminUser; email: string } | null> {
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("[getCurrentAdmin] Supabase env vars are not configured — treating request as signed out.");
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = await AdminRepository.findBySupabaseUserId(user.id);
  if (!admin || !admin.isActive) return null;

  return { admin, email: user.email ?? "" };
}
