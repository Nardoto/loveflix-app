import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth-helpers';
import { completeMultipart } from '@/lib/r2';
import { dispatchOptimizeVideo } from '@/lib/github-dispatch';

const Body = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z
    .array(
      z.object({
        ETag: z.string().min(1),
        PartNumber: z.number().int().min(1),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 });
  }

  await completeMultipart(parsed.data);

  // Fire-and-forget: vídeo terminou de subir → dispara o workflow do
  // GitHub Actions pra rodar `ffmpeg -movflags +faststart` em background.
  // O uploader não espera; o cron horário do mesmo workflow é a rede de
  // segurança caso o dispatch falhe (token expirado, GitHub fora do ar).
  if (parsed.data.key.toLowerCase().endsWith('.mp4')) {
    dispatchOptimizeVideo(parsed.data.key).catch((err) => {
      console.error('[upload/complete] faststart dispatch failed:', err);
    });
  }

  return NextResponse.json({ ok: true, key: parsed.data.key });
}
