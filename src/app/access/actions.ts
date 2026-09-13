"use server";

import { requestAccessSchema } from "@/lib/validation/client-access";
import { requestClientAccess } from "@/server/services/client-access";

const MIN_SUBMIT_DELAY_MS = 1500;

export type RequestAccessResult = { ok: true } | { ok: false; error: string };

// BR-ACC-007: this always resolves the same way regardless of whether a matching
// booking exists — never let the response shape reveal that.
export async function requestAccessAction(raw: Record<string, unknown>): Promise<RequestAccessResult> {
  const parsed = requestAccessSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  const { email, companyWebsite, formRenderedAt } = parsed.data;

  if (companyWebsite) {
    return { ok: true }; // honeypot tripped — pretend success so bots learn nothing
  }
  if (formRenderedAt && Date.now() - formRenderedAt < MIN_SUBMIT_DELAY_MS) {
    return { ok: true };
  }

  try {
    await requestClientAccess(email);
    return { ok: true };
  } catch (error) {
    console.error("[requestAccessAction] Failed to process access request:", error);
    return { ok: false, error: "Something went wrong on our end. Please try again in a moment." };
  }
}
