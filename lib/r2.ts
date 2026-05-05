// Cloudflare R2 helpers — S3-compatible API.
// Docs: https://developers.cloudflare.com/r2/api/s3/api/

import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? '';
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? '';
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? '';
const BUCKET = process.env.R2_BUCKET_NAME ?? 'alluretv-media';
const PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN ?? '';

let _client: S3Client | null = null;

function client(): S3Client {
  if (_client) return _client;
  if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    throw new Error('R2 env vars not set (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)');
  }
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  });
  return _client;
}

export type AssetKind = 'video' | 'audio' | 'cover' | 'ebook-image';

export type ObjectKey = string; // e.g. stories/{slug}/book{N}/video.mp4

export function buildKey(input: {
  storySlug: string;
  bookNumber: number;
  kind: AssetKind;
  locale?: string;        // for audio: en/de/fr/es
  filename?: string;      // for cover: original filename, used to keep extension
  pageIndex?: number;     // for ebook-image
}): ObjectKey {
  const base = `stories/${input.storySlug}/book${input.bookNumber}`;
  switch (input.kind) {
    case 'video':
      return `${base}/video.mp4`;
    case 'audio': {
      const locale = (input.locale ?? 'en').toLowerCase();
      return `${base}/audio-${locale}.mp3`;
    }
    case 'cover': {
      const ext = (input.filename?.split('.').pop() ?? 'jpg').toLowerCase();
      return `${base}/cover.${ext}`;
    }
    case 'ebook-image': {
      const idx = String(input.pageIndex ?? 0).padStart(3, '0');
      return `${base}/ebook/page-${idx}.jpg`;
    }
  }
}

/** Create a multipart upload and return presigned URLs for each part. */
export async function createMultipart(input: {
  key: ObjectKey;
  contentType: string;
  partCount: number;
  partExpiresIn?: number; // seconds, default 1 hour
}): Promise<{ uploadId: string; partUrls: string[] }> {
  const c = client();
  const created = await c.send(
    new CreateMultipartUploadCommand({
      Bucket: BUCKET,
      Key: input.key,
      ContentType: input.contentType,
    }),
  );
  if (!created.UploadId) throw new Error('R2 did not return UploadId');

  const expiresIn = input.partExpiresIn ?? 3600;
  const partUrls: string[] = [];
  for (let i = 1; i <= input.partCount; i++) {
    const url = await getSignedUrl(
      c,
      new UploadPartCommand({
        Bucket: BUCKET,
        Key: input.key,
        UploadId: created.UploadId,
        PartNumber: i,
      }),
      { expiresIn },
    );
    partUrls.push(url);
  }
  return { uploadId: created.UploadId, partUrls };
}

export async function completeMultipart(input: {
  key: ObjectKey;
  uploadId: string;
  parts: Array<{ ETag: string; PartNumber: number }>;
}): Promise<void> {
  const c = client();
  await c.send(
    new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: input.key,
      UploadId: input.uploadId,
      MultipartUpload: {
        Parts: input.parts.sort((a, b) => a.PartNumber - b.PartNumber),
      },
    }),
  );
}

export async function abortMultipart(input: {
  key: ObjectKey;
  uploadId: string;
}): Promise<void> {
  const c = client();
  await c.send(
    new AbortMultipartUploadCommand({
      Bucket: BUCKET,
      Key: input.key,
      UploadId: input.uploadId,
    }),
  );
}

/** Single-shot presigned PUT for small files (covers, ebook images). */
export async function presignedPut(input: {
  key: ObjectKey;
  contentType: string;
  expiresIn?: number;
}): Promise<string> {
  return getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: input.key,
      ContentType: input.contentType,
    }),
    { expiresIn: input.expiresIn ?? 600 },
  );
}

export async function deleteObject(key: ObjectKey): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function headObject(key: ObjectKey): Promise<{ size: number; lastModified?: Date } | null> {
  try {
    const r = await client().send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return { size: r.ContentLength ?? 0, lastModified: r.LastModified };
  } catch {
    return null;
  }
}

/** URL for the playback Worker (NOT a direct R2 URL). Token is appended at runtime. */
export function publicMediaUrl(key: ObjectKey): string {
  if (!PUBLIC_DOMAIN) throw new Error('R2_PUBLIC_DOMAIN not set');
  return `https://${PUBLIC_DOMAIN}/${key}`;
}

export const R2_BUCKET = BUCKET;
