import { z } from "zod";

import { mediaTypeEnum } from "@/lib/db/schema";

// Generous ceiling for raw wedding footage — a sanity bound on the upload-authorization
// endpoint, not a real storage limit (BR-MED-007 endpoints are abuse-prone).
const MAX_SIZE_BYTES = 20 * 1024 * 1024 * 1024;

export const createMediaUploadUrlSchema = z.object({
  originalFilename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
  sizeBytes: z.number().int().positive().max(MAX_SIZE_BYTES),
  mediaType: z.enum(mediaTypeEnum.enumValues),
  durationSeconds: z.number().int().nonnegative().optional(),
  sourceMediaAssetId: z.uuid().optional(),
});

export type CreateMediaUploadUrlInput = z.infer<typeof createMediaUploadUrlSchema>;
