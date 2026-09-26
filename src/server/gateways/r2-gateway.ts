import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { serverEnv } from "@/lib/env";

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  if (!serverEnv.R2_ACCOUNT_ID || !serverEnv.R2_ACCESS_KEY_ID || !serverEnv.R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 credentials are not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in .env.local to enable media uploads.");
  }
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${serverEnv.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: serverEnv.R2_ACCESS_KEY_ID,
      secretAccessKey: serverEnv.R2_SECRET_ACCESS_KEY,
    },
  });
  return cachedClient;
}

function getBucket(): string {
  if (!serverEnv.R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME is not configured.");
  }
  return serverEnv.R2_BUCKET_NAME;
}

// Short-lived per BR-MED-006 — never persisted as a durable database value.
const UPLOAD_URL_TTL_SECONDS = 15 * 60;

export const R2Gateway = {
  async createUploadUrl(params: { key: string; contentType: string }): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: getBucket(),
      Key: params.key,
      ContentType: params.contentType,
    });
    return getSignedUrl(getClient(), command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
  },

  /** Authoritative check that the browser's direct-to-R2 upload actually landed — never trust the browser's own success signal. */
  async headObject(key: string): Promise<{ sizeBytes: number; contentType: string | null } | null> {
    try {
      const result = await getClient().send(new HeadObjectCommand({ Bucket: getBucket(), Key: key }));
      return { sizeBytes: result.ContentLength ?? 0, contentType: result.ContentType ?? null };
    } catch (error) {
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
      if (statusCode === 404) return null;
      throw error;
    }
  },
};
