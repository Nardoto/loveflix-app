// Client-side helper that chunks a File and PUTs each part to a presigned R2 URL.
// Designed for the Studio dialog. Handles 500 MB+ files reliably.

export type AssetKind = 'video' | 'audio' | 'cover' | 'ebook-image';

export type PresignArgs = {
  storySlug: string;
  bookNumber: number;
  kind: AssetKind;
  locale?: 'en' | 'de' | 'fr' | 'es';
  filename?: string;
  pageIndex?: number;
};

export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
  partsDone: number;
  partsTotal: number;
};

export type UploadResult = {
  key: string;
};

type PresignResponse = {
  key: string;
  uploadId: string;
  partSize: number;
  partUrls: string[];
};

const MAX_CONCURRENT = 4;

/**
 * Upload a File to R2 using server-issued presigned multipart URLs.
 * Throws on failure. On abort, calls /api/upload/abort to clean up.
 */
export async function uploadToR2(
  file: File,
  args: PresignArgs,
  opts: {
    onProgress?: (p: UploadProgress) => void;
    signal?: AbortSignal;
  } = {},
): Promise<UploadResult> {
  // 1. Ask the server for a multipart upload + per-part presigned URLs.
  const presignRes = await fetch('/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: opts.signal,
    body: JSON.stringify({
      storySlug: args.storySlug,
      bookNumber: args.bookNumber,
      kind: args.kind,
      locale: args.locale,
      filename: args.filename ?? file.name,
      pageIndex: args.pageIndex,
      size: file.size,
      contentType: file.type || 'application/octet-stream',
    }),
  });
  if (!presignRes.ok) {
    throw new Error(`presign failed: ${presignRes.status} ${await presignRes.text()}`);
  }
  const presign = (await presignRes.json()) as PresignResponse;

  const partSize = presign.partSize;
  const partsTotal = presign.partUrls.length;
  const partProgress = new Array<number>(partsTotal).fill(0);
  let partsDone = 0;

  const reportProgress = () => {
    if (!opts.onProgress) return;
    const loaded = partProgress.reduce((a, b) => a + b, 0);
    opts.onProgress({
      loaded,
      total: file.size,
      percent: Math.min(100, Math.round((loaded / file.size) * 100)),
      partsDone,
      partsTotal,
    });
  };

  // 2. Upload each part. We use XHR (not fetch) because XHR exposes upload progress.
  const uploadPart = (idx: number): Promise<{ ETag: string; PartNumber: number }> =>
    new Promise((resolve, reject) => {
      const start = idx * partSize;
      const end = Math.min(start + partSize, file.size);
      const blob = file.slice(start, end);
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presign.partUrls[idx], true);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          partProgress[idx] = e.loaded;
          reportProgress();
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const etag = xhr.getResponseHeader('ETag');
          if (!etag) {
            reject(new Error(`part ${idx + 1}: missing ETag`));
            return;
          }
          partProgress[idx] = blob.size;
          partsDone += 1;
          reportProgress();
          resolve({ ETag: etag.replace(/"/g, ''), PartNumber: idx + 1 });
        } else {
          reject(new Error(`part ${idx + 1}: HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error(`part ${idx + 1}: network error`));
      xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
      if (opts.signal) {
        if (opts.signal.aborted) {
          xhr.abort();
          return;
        }
        opts.signal.addEventListener('abort', () => xhr.abort(), { once: true });
      }
      xhr.send(blob);
    });

  const parts: Array<{ ETag: string; PartNumber: number }> = [];
  try {
    // Simple bounded concurrency — keeps memory usage and bandwidth predictable.
    const queue = Array.from({ length: partsTotal }, (_, i) => i);
    const workers = Array.from({ length: Math.min(MAX_CONCURRENT, partsTotal) }, async () => {
      while (queue.length) {
        const idx = queue.shift()!;
        const part = await uploadPart(idx);
        parts.push(part);
      }
    });
    await Promise.all(workers);
  } catch (err) {
    // Best-effort cleanup of the multipart upload on the R2 side.
    fetch('/api/upload/abort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: presign.key, uploadId: presign.uploadId }),
      keepalive: true,
    }).catch(() => {});
    throw err;
  }

  // 3. Tell the server to finalize. Parts must be sorted by PartNumber.
  const completeRes = await fetch('/api/upload/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: opts.signal,
    body: JSON.stringify({
      key: presign.key,
      uploadId: presign.uploadId,
      parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
    }),
  });
  if (!completeRes.ok) {
    throw new Error(`complete failed: ${completeRes.status} ${await completeRes.text()}`);
  }
  return { key: presign.key };
}
