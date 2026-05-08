import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth-helpers';
import { buildKey, createMultipart, type AssetKind } from '@/lib/r2';

const PART_SIZE = 50 * 1024 * 1024; // 50 MB

const Body = z.object({
  storySlug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  bookNumber: z.number().int().min(1).max(99),
  kind: z.enum(['video', 'audio', 'cover', 'ebook-image', 'ebook']),
  locale: z.enum(['en', 'de', 'fr', 'es']).optional(),
  filename: z.string().optional(),
  pageIndex: z.number().int().min(0).optional(),
  size: z.number().int().min(1),
  contentType: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 });
  }
  const { storySlug, bookNumber, kind, locale, filename, pageIndex, size, contentType } = parsed.data;

  if ((kind as AssetKind) === 'audio' && !locale) {
    return NextResponse.json({ error: 'audio requires locale' }, { status: 400 });
  }

  const key = buildKey({
    storySlug,
    bookNumber,
    kind: kind as AssetKind,
    locale,
    filename,
    pageIndex,
  });

  const partCount = Math.max(1, Math.ceil(size / PART_SIZE));
  // R2 supports up to 10,000 parts; refuse anything that would exceed this.
  if (partCount > 10_000) {
    return NextResponse.json({ error: 'File too large for chosen part size' }, { status: 413 });
  }

  const { uploadId, partUrls } = await createMultipart({
    key,
    contentType,
    partCount,
  });

  return NextResponse.json({
    key,
    uploadId,
    partSize: PART_SIZE,
    partUrls,
  });
}
