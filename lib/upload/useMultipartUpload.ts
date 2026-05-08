'use client';

// Client-side multipart upload orchestrator. Talks to /api/upload/{presign,
// complete,abort} which already exist on the server side. The user picks a
// file → we call presign, get N pre-signed PUT URLs (50 MB chunks) → we
// PUT each chunk in parallel (with a small concurrency cap so a fat
// 4-track upload doesn't saturate the uplink) → we POST /complete with
// the ETags. Reports a 0..1 progress fraction.
//
// Cancelable: calling abort() PUT-s no more parts and signals the server
// to release the in-flight multipart on R2 (avoids storage charges for
// orphaned chunks).

import { useCallback, useRef, useState } from 'react';

export type UploadKind = 'video' | 'audio' | 'cover' | 'ebook-image' | 'ebook';

type StartArgs = {
  storySlug: string;
  bookNumber: number;
  kind: UploadKind;
  locale?: 'en' | 'de' | 'fr' | 'es';
  filename?: string;
  pageIndex?: number;
  file: File;
};

type Status = 'idle' | 'requesting' | 'uploading' | 'completing' | 'done' | 'error' | 'aborted';

type State = {
  status: Status;
  progress: number;             // 0..1
  uploadedBytes: number;
  totalBytes: number;
  key: string | null;           // final R2 key on success
  error: string | null;
};

const INITIAL: State = {
  status: 'idle',
  progress: 0,
  uploadedBytes: 0,
  totalBytes: 0,
  key: null,
  error: null,
};

const PARALLEL_PARTS = 4;

export function useMultipartUpload() {
  const [state, setState] = useState<State>(INITIAL);
  const abortedRef = useRef(false);
  const inflightRef = useRef<{ key: string; uploadId: string } | null>(null);
  const xhrsRef = useRef<XMLHttpRequest[]>([]);

  const reset = useCallback(() => {
    abortedRef.current = false;
    inflightRef.current = null;
    xhrsRef.current = [];
    setState(INITIAL);
  }, []);

  const start = useCallback(async (args: StartArgs): Promise<string | null> => {
    abortedRef.current = false;
    xhrsRef.current = [];
    setState({
      ...INITIAL,
      status: 'requesting',
      totalBytes: args.file.size,
    });

    let presign: { key: string; uploadId: string; partSize: number; partUrls: string[] };
    try {
      const res = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          storySlug: args.storySlug,
          bookNumber: args.bookNumber,
          kind: args.kind,
          locale: args.locale,
          filename: args.filename ?? args.file.name,
          pageIndex: args.pageIndex,
          size: args.file.size,
          contentType: args.file.type || 'application/octet-stream',
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `presign failed (${res.status})`);
      }
      presign = await res.json();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setState((s) => ({ ...s, status: 'error', error: msg }));
      return null;
    }

    inflightRef.current = { key: presign.key, uploadId: presign.uploadId };
    setState((s) => ({ ...s, status: 'uploading' }));

    const partProgress = new Array<number>(presign.partUrls.length).fill(0);
    const recomputeProgress = () => {
      const uploaded = partProgress.reduce((a, b) => a + b, 0);
      setState((s) => ({
        ...s,
        uploadedBytes: uploaded,
        progress: args.file.size === 0 ? 1 : Math.min(uploaded / args.file.size, 1),
      }));
    };

    const parts: Array<{ ETag: string; PartNumber: number }> = [];

    const uploadPart = (idx: number): Promise<void> =>
      new Promise((resolve, reject) => {
        if (abortedRef.current) return reject(new Error('aborted'));
        const start = idx * presign.partSize;
        const end = Math.min(start + presign.partSize, args.file.size);
        const blob = args.file.slice(start, end);
        const xhr = new XMLHttpRequest();
        xhrsRef.current.push(xhr);
        xhr.open('PUT', presign.partUrls[idx]);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            partProgress[idx] = e.loaded;
            recomputeProgress();
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const etag = xhr.getResponseHeader('ETag');
            if (!etag) return reject(new Error(`part ${idx + 1}: missing ETag`));
            parts.push({ ETag: etag, PartNumber: idx + 1 });
            partProgress[idx] = end - start;
            recomputeProgress();
            resolve();
          } else {
            reject(new Error(`part ${idx + 1} HTTP ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error(`part ${idx + 1} network error`));
        xhr.onabort = () => reject(new Error('aborted'));
        xhr.send(blob);
      });

    // Concurrency-limited dispatch.
    let next = 0;
    const total = presign.partUrls.length;
    try {
      const runners: Promise<void>[] = [];
      for (let c = 0; c < Math.min(PARALLEL_PARTS, total); c++) {
        runners.push(
          (async () => {
            while (true) {
              if (abortedRef.current) throw new Error('aborted');
              const i = next++;
              if (i >= total) return;
              await uploadPart(i);
            }
          })(),
        );
      }
      await Promise.all(runners);

      setState((s) => ({ ...s, status: 'completing' }));
      const completeRes = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key: presign.key,
          uploadId: presign.uploadId,
          parts,
        }),
      });
      if (!completeRes.ok) {
        const j = await completeRes.json().catch(() => ({}));
        throw new Error(j.error ?? `complete failed (${completeRes.status})`);
      }

      inflightRef.current = null;
      setState((s) => ({ ...s, status: 'done', progress: 1, key: presign.key }));
      return presign.key;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Best-effort abort on R2 so the orphan chunks don't stick around.
      if (inflightRef.current) {
        try {
          await fetch('/api/upload/abort', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(inflightRef.current),
          });
        } catch {
          /* swallow — the abort itself is best-effort */
        }
      }
      inflightRef.current = null;
      setState((s) => ({
        ...s,
        status: abortedRef.current ? 'aborted' : 'error',
        error: abortedRef.current ? null : msg,
      }));
      return null;
    }
  }, []);

  const abort = useCallback(() => {
    abortedRef.current = true;
    for (const xhr of xhrsRef.current) {
      try {
        xhr.abort();
      } catch {
        /* ignore */
      }
    }
  }, []);

  return { ...state, start, abort, reset };
}
