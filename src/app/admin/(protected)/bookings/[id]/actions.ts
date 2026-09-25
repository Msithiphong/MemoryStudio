"use server";

import { getCurrentAdmin } from "@/server/auth/get-current-admin";
import { setMaxPromptsSchema, setCustomizationDueDateSchema } from "@/lib/validation/customization";
import {
  lockCustomization,
  unlockCustomization,
  setCustomizationDueDate,
  setMaxPrompts,
  sendCustomizationReminder,
} from "@/server/services/customizations";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin(): Promise<{ id: string; displayName: string } | { error: string }> {
  const current = await getCurrentAdmin();
  if (!current) return { error: "You must be signed in as an admin to do that." };
  return { id: current.admin.id, displayName: current.email };
}

export async function lockCustomizationAction(bookingId: string): Promise<AdminActionResult> {
  const actor = await requireAdmin();
  if ("error" in actor) return { ok: false, error: actor.error };

  try {
    await lockCustomization(bookingId, actor);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export async function unlockCustomizationAction(bookingId: string): Promise<AdminActionResult> {
  const actor = await requireAdmin();
  if ("error" in actor) return { ok: false, error: actor.error };

  try {
    await unlockCustomization(bookingId, actor);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export async function setCustomizationDueDateAction(bookingId: string, raw: unknown): Promise<AdminActionResult> {
  const actor = await requireAdmin();
  if ("error" in actor) return { ok: false, error: actor.error };

  const parsed = setCustomizationDueDateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid date." };
  }

  try {
    // End-of-day on the chosen date, or clear the due date entirely.
    const dueAt = parsed.data.dueDate ? new Date(`${parsed.data.dueDate}T23:59:59`) : null;
    await setCustomizationDueDate(bookingId, dueAt, actor);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export async function setMaxPromptsAction(bookingId: string, raw: unknown): Promise<AdminActionResult> {
  const actor = await requireAdmin();
  if ("error" in actor) return { ok: false, error: actor.error };

  const parsed = setMaxPromptsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid number of prompts." };
  }

  try {
    await setMaxPrompts(bookingId, parsed.data.maxPrompts, actor);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export async function sendCustomizationReminderAction(bookingId: string): Promise<AdminActionResult> {
  const actor = await requireAdmin();
  if ("error" in actor) return { ok: false, error: actor.error };

  try {
    await sendCustomizationReminder(bookingId, actor);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}
