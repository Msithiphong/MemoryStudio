"use server";

import { getCurrentAdmin } from "@/server/auth/get-current-admin";
import { approveInquiry } from "@/server/services/bookings";
import { approveInquirySchema } from "@/lib/validation/booking";

export type ApproveInquiryResult = { ok: true; bookingId: string } | { ok: false; error: string };

export async function approveInquiryAction(inquiryId: string, raw: unknown): Promise<ApproveInquiryResult> {
  const current = await getCurrentAdmin();
  if (!current) {
    return { ok: false, error: "You must be signed in as an admin to do that." };
  }

  const parsed = approveInquirySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid line items." };
  }

  try {
    const booking = await approveInquiry(inquiryId, {
      lineItems: parsed.data.lineItems,
      actor: { id: current.admin.id, displayName: current.email },
    });
    return { ok: true, bookingId: booking.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}
