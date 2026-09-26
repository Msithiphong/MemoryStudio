import { describe, expect, it, afterEach, vi } from "vitest";
import { inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { auditLog, bookings, mediaAssets } from "@/lib/db/schema";
import { BookingRepository } from "@/server/repositories/booking-repository";
import { MediaRepository } from "@/server/repositories/media-repository";
import { generateReferenceCode } from "@/lib/booking-reference";
import {
  BookingNotFoundError,
  InvalidSourceMediaAssetError,
  MediaAlreadyUploadedError,
  MediaNotFoundError,
  MediaUploadNotFoundInStorageError,
  confirmMediaUpload,
  createMediaUploadUrl,
  deleteMediaAsset,
  listMediaForBooking,
  retryMediaUpload,
} from "./media";
import type { Booking } from "@/lib/db/schema";

vi.mock("@/server/gateways/r2-gateway", () => ({
  R2Gateway: { createUploadUrl: vi.fn(), headObject: vi.fn(), deleteObject: vi.fn() },
}));
import { R2Gateway } from "@/server/gateways/r2-gateway";

const hasDb = !!process.env.DATABASE_URL;
const testActor = { id: "test-admin-id", displayName: "Test Admin" };

let dateCounter = 0;
function uniqueFutureDate() {
  const date = new Date();
  date.setDate(date.getDate() + 4_000 + Math.floor(Math.random() * 5_000) + dateCounter++);
  return date.toISOString().slice(0, 10);
}

describe.skipIf(!hasDb)("media service", () => {
  const createdBookingIds: string[] = [];

  afterEach(async () => {
    vi.clearAllMocks();
    const db = getDb();
    if (createdBookingIds.length > 0) {
      await db.delete(mediaAssets).where(inArray(mediaAssets.bookingId, createdBookingIds));
      await db.delete(auditLog).where(inArray(auditLog.bookingId, createdBookingIds));
      await db.delete(bookings).where(inArray(bookings.id, createdBookingIds));
      createdBookingIds.length = 0;
    }
  });

  async function createBooking(): Promise<Booking> {
    const booking = await BookingRepository.create({
      referenceCode: generateReferenceCode(),
      primaryContactName: "__E2E_TEST__ Media",
      email: "__e2e_media__@example.com",
      eventType: "wedding",
      eventDate: uniqueFutureDate(),
      status: "confirmed",
      confirmedAt: new Date(),
      subtotalCents: 49_900,
      totalCents: 49_900,
      requiredRetainerCents: 14_970,
    });
    createdBookingIds.push(booking.id);
    return booking;
  }

  describe("createMediaUploadUrl", () => {
    it("creates a pending media asset with a booking-scoped R2 key and returns a presigned upload URL", async () => {
      const booking = await createBooking();
      vi.mocked(R2Gateway.createUploadUrl).mockResolvedValue("https://r2.example.com/presigned-put");

      const { mediaAsset, uploadUrl } = await createMediaUploadUrl(
        booking.id,
        { originalFilename: "ceremony.mov", mimeType: "video/quicktime", sizeBytes: 1_000_000, mediaType: "original" },
        testActor,
      );

      expect(uploadUrl).toBe("https://r2.example.com/presigned-put");
      expect(mediaAsset.storageStatus).toBe("pending");
      expect(mediaAsset.isVisible).toBe(false);
      expect(mediaAsset.r2ObjectKey).toMatch(new RegExp(`^bookings/${booking.id}/original/.+\\.mov$`));
      expect(R2Gateway.createUploadUrl).toHaveBeenCalledWith({ key: mediaAsset.r2ObjectKey, contentType: "video/quicktime" });
    });

    it("throws BookingNotFoundError for a missing booking", async () => {
      await expect(
        createMediaUploadUrl(
          "00000000-0000-0000-0000-000000000000",
          { originalFilename: "a.mov", mimeType: "video/quicktime", sizeBytes: 100, mediaType: "original" },
          testActor,
        ),
      ).rejects.toThrow(BookingNotFoundError);
    });

    it("rejects a sourceMediaAssetId that belongs to a different booking", async () => {
      const bookingA = await createBooking();
      const bookingB = await createBooking();
      vi.mocked(R2Gateway.createUploadUrl).mockResolvedValue("https://r2.example.com/presigned-put");

      const { mediaAsset: original } = await createMediaUploadUrl(
        bookingA.id,
        { originalFilename: "a.mov", mimeType: "video/quicktime", sizeBytes: 100, mediaType: "original" },
        testActor,
      );

      await expect(
        createMediaUploadUrl(
          bookingB.id,
          { originalFilename: "a.mp4", mimeType: "video/mp4", sizeBytes: 100, mediaType: "web", sourceMediaAssetId: original.id },
          testActor,
        ),
      ).rejects.toThrow(InvalidSourceMediaAssetError);
    });
  });

  describe("confirmMediaUpload", () => {
    it("marks the asset uploaded using the actual size/type R2 reports, not the client's claim", async () => {
      const booking = await createBooking();
      vi.mocked(R2Gateway.createUploadUrl).mockResolvedValue("https://r2.example.com/presigned-put");
      const { mediaAsset } = await createMediaUploadUrl(
        booking.id,
        { originalFilename: "a.mov", mimeType: "video/quicktime", sizeBytes: 100, mediaType: "original" },
        testActor,
      );

      vi.mocked(R2Gateway.headObject).mockResolvedValue({ sizeBytes: 999_999, contentType: "video/quicktime" });
      const confirmed = await confirmMediaUpload(mediaAsset.id, testActor);

      expect(confirmed.storageStatus).toBe("uploaded");
      expect(confirmed.sizeBytes).toBe(999_999);
      expect(confirmed.uploadedAt).not.toBeNull();
    });

    it("marks the asset failed and throws when the object never reached R2", async () => {
      const booking = await createBooking();
      vi.mocked(R2Gateway.createUploadUrl).mockResolvedValue("https://r2.example.com/presigned-put");
      const { mediaAsset } = await createMediaUploadUrl(
        booking.id,
        { originalFilename: "a.mov", mimeType: "video/quicktime", sizeBytes: 100, mediaType: "original" },
        testActor,
      );

      vi.mocked(R2Gateway.headObject).mockResolvedValue(null);
      await expect(confirmMediaUpload(mediaAsset.id, testActor)).rejects.toThrow(MediaUploadNotFoundInStorageError);

      const reloaded = await MediaRepository.findById(mediaAsset.id);
      expect(reloaded?.storageStatus).toBe("failed");
    });

    it("is idempotent — confirming an already-uploaded asset does not call R2 again", async () => {
      const booking = await createBooking();
      vi.mocked(R2Gateway.createUploadUrl).mockResolvedValue("https://r2.example.com/presigned-put");
      const { mediaAsset } = await createMediaUploadUrl(
        booking.id,
        { originalFilename: "a.mov", mimeType: "video/quicktime", sizeBytes: 100, mediaType: "original" },
        testActor,
      );
      vi.mocked(R2Gateway.headObject).mockResolvedValue({ sizeBytes: 500, contentType: "video/quicktime" });
      await confirmMediaUpload(mediaAsset.id, testActor);
      vi.mocked(R2Gateway.headObject).mockClear();

      const secondConfirm = await confirmMediaUpload(mediaAsset.id, testActor);

      expect(secondConfirm.storageStatus).toBe("uploaded");
      expect(R2Gateway.headObject).not.toHaveBeenCalled();
    });

    it("throws MediaNotFoundError for an unknown media asset id", async () => {
      await expect(confirmMediaUpload("00000000-0000-0000-0000-000000000000", testActor)).rejects.toThrow(MediaNotFoundError);
    });
  });

  describe("retryMediaUpload", () => {
    it("reuses the same R2 object key and resets a failed asset back to pending", async () => {
      const booking = await createBooking();
      vi.mocked(R2Gateway.createUploadUrl).mockResolvedValue("https://r2.example.com/presigned-put-1");
      const { mediaAsset } = await createMediaUploadUrl(
        booking.id,
        { originalFilename: "a.mov", mimeType: "video/quicktime", sizeBytes: 100, mediaType: "original" },
        testActor,
      );
      vi.mocked(R2Gateway.headObject).mockResolvedValue(null);
      await expect(confirmMediaUpload(mediaAsset.id, testActor)).rejects.toThrow(MediaUploadNotFoundInStorageError);

      vi.mocked(R2Gateway.createUploadUrl).mockResolvedValue("https://r2.example.com/presigned-put-2");
      const retried = await retryMediaUpload(mediaAsset.id, testActor);

      expect(retried.uploadUrl).toBe("https://r2.example.com/presigned-put-2");
      expect(retried.mediaAsset.storageStatus).toBe("pending");
      expect(R2Gateway.createUploadUrl).toHaveBeenCalledWith({ key: mediaAsset.r2ObjectKey, contentType: mediaAsset.mimeType });

      const allForBooking = await listMediaForBooking(booking.id);
      expect(allForBooking).toHaveLength(1); // no duplicate row created by the retry
    });

    it("throws MediaAlreadyUploadedError when the asset already finished uploading", async () => {
      const booking = await createBooking();
      vi.mocked(R2Gateway.createUploadUrl).mockResolvedValue("https://r2.example.com/presigned-put");
      const { mediaAsset } = await createMediaUploadUrl(
        booking.id,
        { originalFilename: "a.mov", mimeType: "video/quicktime", sizeBytes: 100, mediaType: "original" },
        testActor,
      );
      vi.mocked(R2Gateway.headObject).mockResolvedValue({ sizeBytes: 100, contentType: "video/quicktime" });
      await confirmMediaUpload(mediaAsset.id, testActor);

      await expect(retryMediaUpload(mediaAsset.id, testActor)).rejects.toThrow(MediaAlreadyUploadedError);
    });
  });

  describe("deleteMediaAsset", () => {
    it("deletes the R2 object and marks the row deleted while preserving it for history", async () => {
      const booking = await createBooking();
      vi.mocked(R2Gateway.createUploadUrl).mockResolvedValue("https://r2.example.com/presigned-put");
      const { mediaAsset } = await createMediaUploadUrl(
        booking.id,
        { originalFilename: "wrong-video.mov", mimeType: "video/quicktime", sizeBytes: 100, mediaType: "original" },
        testActor,
      );
      vi.mocked(R2Gateway.headObject).mockResolvedValue({ sizeBytes: 100, contentType: "video/quicktime" });
      await confirmMediaUpload(mediaAsset.id, testActor);
      vi.mocked(R2Gateway.deleteObject).mockResolvedValue(undefined);

      const deleted = await deleteMediaAsset(mediaAsset.id, testActor);

      expect(R2Gateway.deleteObject).toHaveBeenCalledWith(mediaAsset.r2ObjectKey);
      expect(deleted.storageStatus).toBe("deleted");
      expect(deleted.storageDeletedAt).not.toBeNull();
      expect(deleted.isVisible).toBe(false);

      const stillThere = await MediaRepository.findById(mediaAsset.id);
      expect(stillThere).not.toBeNull(); // metadata row preserved, not hard-deleted
    });

    it("is idempotent — deleting an already-deleted asset does not call R2 again", async () => {
      const booking = await createBooking();
      vi.mocked(R2Gateway.createUploadUrl).mockResolvedValue("https://r2.example.com/presigned-put");
      const { mediaAsset } = await createMediaUploadUrl(
        booking.id,
        { originalFilename: "a.mov", mimeType: "video/quicktime", sizeBytes: 100, mediaType: "original" },
        testActor,
      );
      vi.mocked(R2Gateway.deleteObject).mockResolvedValue(undefined);
      await deleteMediaAsset(mediaAsset.id, testActor);
      vi.mocked(R2Gateway.deleteObject).mockClear();

      const secondDelete = await deleteMediaAsset(mediaAsset.id, testActor);

      expect(secondDelete.storageStatus).toBe("deleted");
      expect(R2Gateway.deleteObject).not.toHaveBeenCalled();
    });

    it("throws MediaNotFoundError for an unknown media asset id", async () => {
      await expect(deleteMediaAsset("00000000-0000-0000-0000-000000000000", testActor)).rejects.toThrow(MediaNotFoundError);
    });
  });

  describe("listMediaForBooking", () => {
    it("throws BookingNotFoundError for a missing booking", async () => {
      await expect(listMediaForBooking("00000000-0000-0000-0000-000000000000")).rejects.toThrow(BookingNotFoundError);
    });
  });
});
