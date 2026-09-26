"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createMediaUploadUrlAction, retryMediaUploadAction, confirmMediaUploadAction } from "./media-actions";
import type { MediaAsset, MediaType, MediaStorageStatus } from "@/lib/db/schema";

const MEDIA_TYPE_OPTIONS: { value: MediaType; label: string }[] = [
  { value: "original", label: "Original recording" },
  { value: "web", label: "Web-friendly playback copy" },
  { value: "highlight", label: "Highlight edit" },
  { value: "delivery_archive", label: "Delivery archive" },
  { value: "other", label: "Other" },
];

const STATUS_VARIANTS: Record<MediaStorageStatus, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  uploaded: "secondary",
  failed: "destructive",
  deleted: "destructive",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function uploadWithProgress(url: string, file: File, contentType: string, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`R2 rejected the upload (status ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Upload failed — check your connection and retry."));
    xhr.send(file);
  });
}

export type MediaAdminPanelProps = {
  bookingId: string;
  mediaAssets: MediaAsset[];
};

export function MediaAdminPanel({ bookingId, mediaAssets }: MediaAdminPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const retryInputRef = useRef<HTMLInputElement>(null);
  const [mediaType, setMediaType] = useState<MediaType>("original");
  const [error, setError] = useState<string | null>(null);
  const [uploadingLabel, setUploadingLabel] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [retryTargetId, setRetryTargetId] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setError(null);
    setUploadingLabel(file.name);
    setProgress(0);

    const created = await createMediaUploadUrlAction(bookingId, {
      originalFilename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      mediaType,
    });
    if (!created.ok) {
      setError(created.error);
      setUploadingLabel(null);
      return;
    }

    try {
      await uploadWithProgress(created.uploadUrl, file, file.type || "application/octet-stream", setProgress);
      const confirmed = await confirmMediaUploadAction(created.mediaAssetId);
      if (!confirmed.ok) {
        setError(`${confirmed.error} The file is saved as pending — use Retry to try again.`);
        return;
      }
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed. Use Retry to try again.");
    } finally {
      setUploadingLabel(null);
    }
  }

  async function handleRetry(assetId: string, file: File) {
    setError(null);
    setUploadingLabel(file.name);
    setProgress(0);

    const retried = await retryMediaUploadAction(assetId);
    if (!retried.ok) {
      setError(retried.error);
      setUploadingLabel(null);
      return;
    }

    try {
      await uploadWithProgress(retried.uploadUrl, file, file.type || "application/octet-stream", setProgress);
      const confirmed = await confirmMediaUploadAction(assetId);
      if (!confirmed.ok) {
        setError(confirmed.error);
        return;
      }
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed. Use Retry to try again.");
    } finally {
      setUploadingLabel(null);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {mediaAssets.length > 0 ? (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mediaAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>{asset.displayName ?? asset.originalFilename}</TableCell>
                  <TableCell className="text-muted-foreground">{asset.mediaType}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[asset.storageStatus]}>{asset.storageStatus}</Badge>
                  </TableCell>
                  <TableCell>{formatBytes(asset.sizeBytes)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {asset.uploadedAt ? new Date(asset.uploadedAt).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>
                    {asset.storageStatus === "pending" || asset.storageStatus === "failed" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingLabel !== null}
                        onClick={() => {
                          setRetryTargetId(asset.id);
                          retryInputRef.current?.click();
                        }}
                      >
                        Retry upload
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No media uploaded yet.</p>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="mediaType">Media type</Label>
          <Select value={mediaType} onValueChange={(value) => setMediaType(value as MediaType)}>
            <SelectTrigger id="mediaType" className="mt-1.5 w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEDIA_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="button" variant="outline" size="sm" disabled={uploadingLabel !== null} onClick={() => fileInputRef.current?.click()}>
          {uploadingLabel ? "Uploading…" : "Upload file"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleUpload(file);
          }}
        />
        <input
          ref={retryInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file && retryTargetId) void handleRetry(retryTargetId, file);
          }}
        />

        {uploadingLabel ? (
          <div className="w-full">
            <p className="text-sm text-muted-foreground">
              {uploadingLabel} — {progress}%
            </p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
