"use server";

import { getCurrentAdmin } from "@/server/auth/get-current-admin";
import { createMediaUploadUrlSchema } from "@/lib/validation/media";
import { createMediaUploadUrl, retryMediaUpload, confirmMediaUpload } from "@/server/services/media";

async function requireAdmin(): Promise<{ id: string; displayName: string } | { error: string }> {
  const current = await getCurrentAdmin();
  if (!current) return { error: "You must be signed in as an admin to do that." };
  return { id: current.admin.id, displayName: current.email };
}

export type CreateMediaUploadUrlResult = { ok: true; mediaAssetId: string; uploadUrl: string } | { ok: false; error: string };

export async function createMediaUploadUrlAction(bookingId: string, raw: unknown): Promise<CreateMediaUploadUrlResult> {
  const actor = await requireAdmin();
  if ("error" in actor) return { ok: false, error: actor.error };

  const parsed = createMediaUploadUrlSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "That file could not be authorized for upload." };
  }

  try {
    const { mediaAsset, uploadUrl } = await createMediaUploadUrl(bookingId, parsed.data, actor);
    return { ok: true, mediaAssetId: mediaAsset.id, uploadUrl };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export type RetryMediaUploadResult = { ok: true; uploadUrl: string } | { ok: false; error: string };

export async function retryMediaUploadAction(mediaAssetId: string): Promise<RetryMediaUploadResult> {
  const actor = await requireAdmin();
  if ("error" in actor) return { ok: false, error: actor.error };

  try {
    const { uploadUrl } = await retryMediaUpload(mediaAssetId, actor);
    return { ok: true, uploadUrl };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export type ConfirmMediaUploadResult = { ok: true } | { ok: false; error: string };

export async function confirmMediaUploadAction(mediaAssetId: string): Promise<ConfirmMediaUploadResult> {
  const actor = await requireAdmin();
  if ("error" in actor) return { ok: false, error: actor.error };

  try {
    await confirmMediaUpload(mediaAssetId, actor);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}
