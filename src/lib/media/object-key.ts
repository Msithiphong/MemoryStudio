import { randomUUID } from "node:crypto";

import type { MediaType } from "@/lib/db/schema";

// Mirrors ARCHITECTURE.md's key format: bookings/{bookingUuid}/{folder}/{mediaUuid}.{ext}
const FOLDER_BY_MEDIA_TYPE: Record<MediaType, string> = {
  original: "original",
  web: "web",
  highlight: "highlight",
  delivery_archive: "delivery",
  other: "other",
};

function extensionFromFilename(filename: string): string {
  const match = /\.([a-zA-Z0-9]{1,10})$/.exec(filename);
  return match ? match[1].toLowerCase() : "bin";
}

/** Never derive security from obscurity of this key — access is authorized separately (ARCHITECTURE.md). */
export function createMediaObjectKey(params: { bookingId: string; mediaType: MediaType; originalFilename: string }): string {
  const folder = FOLDER_BY_MEDIA_TYPE[params.mediaType];
  const ext = extensionFromFilename(params.originalFilename);
  return `bookings/${params.bookingId}/${folder}/${randomUUID()}.${ext}`;
}
