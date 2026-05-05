// Cloudflare Worker — playback gate for AllureTV media.
//
// Flow:
//   GET https://media.alluretv.net/stories/<slug>/book<N>/video.mp4?token=<JWT>
//   1. If the requested key matches FREE_PREFIXES → serve directly (covers, free chapters).
//   2. Otherwise verify the JWT signed by the Next.js app (HS256 / shared secret).
//   3. Check the `tier` claim — only "active" / "trialing" can read paid keys.
//   4. Stream from R2 honoring Range requests so <video> seek works.

import { jwtVerify } from 'jose';

interface Env {
  MEDIA: R2Bucket;
  JWT_MEDIA_SECRET: string; // wrangler secret put JWT_MEDIA_SECRET
  FREE_PREFIXES?: string;   // comma-separated list (e.g. "stories/he-had-never-touched-me/book1/")
}

type Tier = 'active' | 'trialing' | 'free';

const TEXT_HEADERS = { 'Content-Type': 'text/plain; charset=utf-8' };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: TEXT_HEADERS });
    }

    const url = new URL(request.url);
    // Strip leading slash; keys never start with one.
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    if (!key) {
      return new Response('Missing key', { status: 400, headers: TEXT_HEADERS });
    }

    const isFree = isFreeKey(key, env.FREE_PREFIXES);
    if (!isFree) {
      const token = url.searchParams.get('token');
      if (!token) {
        return new Response('Missing token', { status: 401, headers: TEXT_HEADERS });
      }
      let tier: Tier;
      try {
        const { payload } = await jwtVerify(
          token,
          new TextEncoder().encode(env.JWT_MEDIA_SECRET),
          { algorithms: ['HS256'] },
        );
        tier = (payload.tier as Tier) ?? 'free';
      } catch {
        return new Response('Invalid token', { status: 401, headers: TEXT_HEADERS });
      }
      if (tier === 'free') {
        return new Response('Subscription required', { status: 402, headers: TEXT_HEADERS });
      }
    }

    // Translate Range header → R2Range.
    const rangeHeader = request.headers.get('range');
    const range = parseRange(rangeHeader);

    // HEAD responses just need metadata.
    if (request.method === 'HEAD') {
      const head = await env.MEDIA.head(key);
      if (!head) return new Response('Not found', { status: 404, headers: TEXT_HEADERS });
      return new Response(null, {
        status: 200,
        headers: {
          'Content-Type': head.httpMetadata?.contentType ?? guessContentType(key),
          'Content-Length': String(head.size),
          'Accept-Ranges': 'bytes',
          'Cache-Control': isFree ? 'public, max-age=86400' : 'private, max-age=3600',
        },
      });
    }

    const obj = await env.MEDIA.get(key, range ? { range } : undefined);
    if (!obj) return new Response('Not found', { status: 404, headers: TEXT_HEADERS });

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    if (!headers.get('Content-Type')) headers.set('Content-Type', guessContentType(key));
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', isFree ? 'public, max-age=86400' : 'private, max-age=3600');

    let status = 200;
    if (range && obj.range) {
      const r = obj.range as { offset?: number; length?: number; suffix?: number };
      const total = obj.size;
      const offset = r.offset ?? (r.suffix !== undefined ? total - r.suffix : 0);
      const length = r.length ?? total - offset;
      headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${total}`);
      headers.set('Content-Length', String(length));
      status = 206;
    } else {
      headers.set('Content-Length', String(obj.size));
    }

    return new Response(obj.body, { status, headers });
  },
} satisfies ExportedHandler<Env>;

function isFreeKey(key: string, freePrefixes: string | undefined): boolean {
  if (!freePrefixes) return false;
  const list = freePrefixes
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.some((prefix) => key.startsWith(prefix));
}

function parseRange(header: string | null): R2Range | undefined {
  if (!header) return undefined;
  // Single-range only (e.g. "bytes=0-1023" or "bytes=-500").
  const m = /^bytes=(\d+)?-(\d+)?$/.exec(header.trim());
  if (!m) return undefined;
  const [, startStr, endStr] = m;
  if (startStr && endStr) {
    const start = Number(startStr);
    const end = Number(endStr);
    return { offset: start, length: end - start + 1 };
  }
  if (startStr) return { offset: Number(startStr) };
  if (endStr) return { suffix: Number(endStr) };
  return undefined;
}

function guessContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp4':
      return 'video/mp4';
    case 'mp3':
      return 'audio/mpeg';
    case 'webm':
      return 'video/webm';
    case 'm3u8':
      return 'application/vnd.apple.mpegurl';
    case 'ts':
      return 'video/mp2t';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}
