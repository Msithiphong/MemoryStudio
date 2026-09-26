import { createMediaObjectKey } from "@/lib/media/object-key";
import type { MediaAsset } from "@/lib/db/schema";
import type { CreateMediaUploadUrlInput } from "@/lib/validation/media";
import { AuditRepository } from "@/server/repositories/audit-repository";
import { BookingRepository } from "@/server/repositories/booking-repository";
import { MediaRepository } from "@/server/repositories/media-repository";
import { R2Gateway } from "@/server/gateways/r2-gateway";

export class BookingNotFoundError extends Error {
  constructor() {
    super("Booking not found.");
    this.name = "BookingNotFoundError";
  }
}

export class MediaNotFoundError extends Error {
  constructor() {
    super("Media asset not found.");
    this.name = "MediaNotFoundError";
  }
}

export class MediaAlreadyUploadedError extends Error {
  constructor() {
    super("This file has already finished uploading.");
    this.name = "MediaAlreadyUploadedError";
  }
}

export class InvalidSourceMediaAssetError extends Error {
  constructor() {
    super("The source media asset must belong to the same booking.");
    this.name = "InvalidSourceMediaAssetError";
  }
}

export class MediaUploadNotFoundInStorageError extends Error {
  constructor() {
    super("The upload has not reached storage yet. Retry the upload and confirm again.");
    this.name = "MediaUploadNotFoundInStorageError";
  }
}

type Actor = { id: string; displayName: string };

export async function createMediaUploadUrl(
  bookingId: string,
  input: CreateMediaUploadUrlInput,
  actor: Actor,
): Promise<{ mediaAsset: MediaAsset; uploadUrl: string }> {
  const booking = await BookingRepository.findById(bookingId);
  if (!booking) throw new BookingNotFoundError();

  if (input.sourceMediaAssetId) {
    const source = await MediaRepository.findById(input.sourceMediaAssetId);
    if (!source || source.bookingId !== bookingId) throw new InvalidSourceMediaAssetError();
  }

  const r2ObjectKey = createMediaObjectKey({
    bookingId,
    mediaType: input.mediaType,
    originalFilename: input.originalFilename,
  });

  const mediaAsset = await MediaRepository.create({
    bookingId,
    sourceMediaAssetId: input.sourceMediaAssetId ?? null,
    mediaType: input.mediaType,
    r2ObjectKey,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    durationSeconds: input.durationSeconds ?? null,
  });

  const uploadUrl = await R2Gateway.createUploadUrl({ key: r2ObjectKey, contentType: input.mimeType });

  await AuditRepository.record({
    actorType: "admin",
    actorId: actor.id,
    actorDisplayName: actor.displayName,
    bookingId,
    action: "media.upload_url_created",
    metadataJson: { mediaAssetId: mediaAsset.id, mediaType: input.mediaType, originalFilename: input.originalFilename },
  });

  return { mediaAsset, uploadUrl };
}

/** Re-issues a presigned PUT for an existing pending/failed row instead of creating a new one, per ARCHITECTURE.md's retry-without-duplicates rule. */
export async function retryMediaUpload(mediaAssetId: string, actor: Actor): Promise<{ mediaAsset: MediaAsset; uploadUrl: string }> {
  const asset = await MediaRepository.findById(mediaAssetId);
  if (!asset) throw new MediaNotFoundError();
  if (asset.storageStatus === "uploaded") throw new MediaAlreadyUploadedError();

  const uploadUrl = await R2Gateway.createUploadUrl({ key: asset.r2ObjectKey, contentType: asset.mimeType });

  const mediaAsset = asset.storageStatus === "failed" ? ((await MediaRepository.resetToPending(mediaAssetId)) ?? asset) : asset;

  await AuditRepository.record({
    actorType: "admin",
    actorId: actor.id,
    actorDisplayName: actor.displayName,
    bookingId: asset.bookingId,
    action: "media.upload_retried",
    metadataJson: { mediaAssetId },
  });

  return { mediaAsset, uploadUrl };
}

/** Confirms the direct browser-to-R2 upload actually landed before trusting it as deliverable media — never trust the browser's own success signal. */
export async function confirmMediaUpload(mediaAssetId: string, actor: Actor): Promise<MediaAsset> {
  const asset = await MediaRepository.findById(mediaAssetId);
  if (!asset) throw new MediaNotFoundError();
  if (asset.storageStatus === "uploaded") return asset; // idempotent no-op, mirrors lock/unlock pattern

  const head = await R2Gateway.headObject(asset.r2ObjectKey);
  if (!head) {
    await MediaRepository.markFailed(mediaAssetId);
    throw new MediaUploadNotFoundInStorageError();
  }

  const updated = await MediaRepository.markUploaded(mediaAssetId, {
    sizeBytes: head.sizeBytes,
    mimeType: head.contentType ?? asset.mimeType,
  });
  if (!updated) throw new MediaNotFoundError();

  await AuditRepository.record({
    actorType: "admin",
    actorId: actor.id,
    actorDisplayName: actor.displayName,
    bookingId: asset.bookingId,
    action: "media.uploaded",
    metadataJson: { mediaAssetId, sizeBytes: head.sizeBytes },
  });

  return updated;
}

/**
 * Deletes the R2 object but preserves the media_assets row (marked `deleted`) for history,
 * per DATABASE.md 3.14's application-controlled deletion workflow. Covers the "wrong file
 * uploaded" case — idempotent if the asset is already deleted.
 */
export async function deleteMediaAsset(mediaAssetId: string, actor: Actor): Promise<MediaAsset> {
  const asset = await MediaRepository.findById(mediaAssetId);
  if (!asset) throw new MediaNotFoundError();
  if (asset.storageStatus === "deleted") return asset; // idempotent no-op

  await R2Gateway.deleteObject(asset.r2ObjectKey);

  const updated = await MediaRepository.markDeleted(mediaAssetId);
  if (!updated) throw new MediaNotFoundError();

  await AuditRepository.record({
    actorType: "admin",
    actorId: actor.id,
    actorDisplayName: actor.displayName,
    bookingId: asset.bookingId,
    action: "media.deleted",
    metadataJson: { mediaAssetId, originalFilename: asset.originalFilename },
  });

  return updated;
}

export async function listMediaForBooking(bookingId: string): Promise<MediaAsset[]> {
  const booking = await BookingRepository.findById(bookingId);
  if (!booking) throw new BookingNotFoundError();
  return MediaRepository.listForBooking(bookingId);
}
