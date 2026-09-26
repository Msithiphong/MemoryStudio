import { asc, eq } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/lib/db";
import { mediaAssets, type MediaAsset, type NewMediaAsset } from "@/lib/db/schema";

export const MediaRepository = {
  async create(data: NewMediaAsset, executor: DbExecutor = getDb()): Promise<MediaAsset> {
    const [asset] = await executor.insert(mediaAssets).values(data).returning();
    return asset;
  },

  async findById(id: string, executor: DbExecutor = getDb()): Promise<MediaAsset | null> {
    const [asset] = await executor.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
    return asset ?? null;
  },

  async listForBooking(bookingId: string, executor: DbExecutor = getDb()): Promise<MediaAsset[]> {
    return executor
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.bookingId, bookingId))
      .orderBy(asc(mediaAssets.sortOrder), asc(mediaAssets.createdAt));
  },

  /** Overwrites the claimed size/MIME type with what R2 actually reports — never trust the client's original claim. */
  async markUploaded(id: string, data: { sizeBytes: number; mimeType: string }, executor: DbExecutor = getDb()): Promise<MediaAsset | null> {
    const [asset] = await executor
      .update(mediaAssets)
      .set({ storageStatus: "uploaded", uploadedAt: new Date(), sizeBytes: data.sizeBytes, mimeType: data.mimeType })
      .where(eq(mediaAssets.id, id))
      .returning();
    return asset ?? null;
  },

  async markFailed(id: string, executor: DbExecutor = getDb()): Promise<MediaAsset | null> {
    const [asset] = await executor.update(mediaAssets).set({ storageStatus: "failed" }).where(eq(mediaAssets.id, id)).returning();
    return asset ?? null;
  },

  async resetToPending(id: string, executor: DbExecutor = getDb()): Promise<MediaAsset | null> {
    const [asset] = await executor.update(mediaAssets).set({ storageStatus: "pending" }).where(eq(mediaAssets.id, id)).returning();
    return asset ?? null;
  },

  /** Preserves the metadata row for history (DATABASE.md 3.14) — never hard-deletes a media_assets record. */
  async markDeleted(id: string, executor: DbExecutor = getDb()): Promise<MediaAsset | null> {
    const [asset] = await executor
      .update(mediaAssets)
      .set({ storageStatus: "deleted", storageDeletedAt: new Date(), isVisible: false, isDownloadable: false })
      .where(eq(mediaAssets.id, id))
      .returning();
    return asset ?? null;
  },
};
