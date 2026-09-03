"use server";

import { inquirySchema } from "@/lib/validation/inquiry";
import { submitInquiry } from "@/server/services/inquiries";

const MIN_SUBMIT_DELAY_MS = 1500;

export type SubmitInquiryResult =
  | { ok: true }
  | { ok: false; fieldErrors: Partial<Record<string, string>>; formError?: string };

export async function submitInquiryAction(raw: Record<string, unknown>): Promise<SubmitInquiryResult> {
  const parsed = inquirySchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<string, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  const { companyWebsite, formRenderedAt, ...data } = parsed.data;

  if (companyWebsite) {
    // Honeypot tripped — pretend success so bots don't learn anything.
    return { ok: true };
  }

  if (formRenderedAt && Date.now() - formRenderedAt < MIN_SUBMIT_DELAY_MS) {
    return { ok: true };
  }

  try {
    await submitInquiry({
      firstName: data.firstName,
      lastName: data.lastName || null,
      partnerFirstName: data.partnerFirstName || null,
      partnerLastName: data.partnerLastName || null,
      email: data.email,
      phone: data.phone || null,
      eventType: data.eventType,
      eventDate: data.eventDate,
      venueName: data.venueName || null,
      venueCity: data.venueCity || null,
      venueState: data.venueState || null,
      estimatedGuestCount: data.estimatedGuestCount ? Number(data.estimatedGuestCount) : null,
      packageInterest: data.packageInterest || null,
      message: data.message || null,
      leadSource: data.leadSource || null,
    });
    return { ok: true };
  } catch (error) {
    console.error("[submitInquiryAction] Failed to submit inquiry:", error);
    return {
      ok: false,
      fieldErrors: {},
      formError: "Something went wrong on our end. Please try again in a moment.",
    };
  }
}
