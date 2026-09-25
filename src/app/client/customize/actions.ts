"use server";

import { getCurrentClient } from "@/server/auth/get-current-client";
import { customizationFormSchema } from "@/lib/validation/customization";
import {
  updateCustomization,
  CustomizationLockedError,
  TooManyPromptsError,
  PromptRequiredError,
} from "@/server/services/customizations";

export type SaveCustomizationResult = { ok: true } | { ok: false; error: string };

export async function saveCustomizationAction(raw: unknown): Promise<SaveCustomizationResult> {
  const current = await getCurrentClient();
  if (!current) {
    return { ok: false, error: "Your session has expired. Please request a new access link." };
  }

  const parsed = customizationFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  try {
    await updateCustomization(current.booking.id, parsed.data);
    return { ok: true };
  } catch (error) {
    if (error instanceof CustomizationLockedError || error instanceof TooManyPromptsError || error instanceof PromptRequiredError) {
      return { ok: false, error: error.message };
    }
    console.error("[saveCustomizationAction] Failed to save customization:", error);
    return { ok: false, error: "Something went wrong on our end. Please try again in a moment." };
  }
}
