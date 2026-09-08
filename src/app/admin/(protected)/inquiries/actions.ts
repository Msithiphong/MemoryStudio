"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/server/auth/get-current-admin";
import { reviewInquiry } from "@/server/services/inquiries";
import type { InquiryStatus } from "@/lib/db/schema";

export type ReviewInquiryResult = { ok: true } | { ok: false; error: string };

export async function reviewInquiryAction(id: string, newStatus: InquiryStatus): Promise<ReviewInquiryResult> {
  // Re-check authorization here — never trust that the page-level redirect already ran.
  const current = await getCurrentAdmin();
  if (!current) {
    return { ok: false, error: "You must be signed in as an admin to do that." };
  }

  try {
    await reviewInquiry(id, newStatus, { id: current.admin.id, displayName: current.email });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }

  revalidatePath(`/admin/inquiries/${id}`);
  revalidatePath("/admin/inquiries");
  return { ok: true };
}
