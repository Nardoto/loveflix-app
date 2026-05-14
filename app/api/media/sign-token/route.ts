import { NextResponse } from 'next/server';
import { getUser, isAdminEmail } from '@/lib/auth-helpers';
import { signMediaToken, type MediaTokenClaims } from '@/lib/media-token';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Assina um JWT pro Cloudflare Worker validar.
 *
 * Sem `?slug=`: comportamento herdado — assina baseado só no tier do
 * usuário (active/trialing/free). Usado por chamadas antigas que ainda
 * não passam o slug.
 *
 * Com `?slug=X`: olha o flag `is_free` da story. Se for grátis, faz
 * override: assina com `tier='active'` + `keyPrefix='stories/<slug>/'`
 * pra que mesmo usuário não-assinante consiga reproduzir. O keyPrefix
 * limita o token ÀQUELA story (na Phase 2 o Worker valida o startsWith
 * pra fechar o vazamento de token entre stories).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const debug = url.searchParams.get('debug') === '1';
  const user = await getUser();
  if (!user) {
    // Permite anônimo APENAS se a chamada é pra uma story grátis.
    // Sem slug, mantemos o 401 histórico.
    const slug = url.searchParams.get('slug');
    if (!slug) {
      return NextResponse.json(
        { error: 'Not authenticated', reason: debug ? 'no-slug' : undefined },
        { status: 401 },
      );
    }
    const probe = await loadFreeStoryDetailed(slug);
    if (!probe.isFree) {
      return NextResponse.json(
        {
          error: 'Not authenticated',
          reason: debug ? probe.reason : undefined,
          detail: debug ? probe.detail : undefined,
        },
        { status: 401 },
      );
    }
    // Anônimo em story free: assina token específico daquela story.
    const token = await signMediaToken({
      userId: `anon:${slug}`,
      tier: 'active',
      keyPrefix: `stories/${slug}/`,
      expirySeconds: 7200,
    });
    return NextResponse.json({ token, tier: 'active', expiresIn: 7200 });
  }

  const slug = url.searchParams.get('slug');

  // Logado em story free: também assina bypass scoped (pra não depender
  // da subscription do usuário pra liberar a amostra).
  if (slug) {
    const probe = await loadFreeStoryDetailed(slug);
    if (probe.isFree) {
      const token = await signMediaToken({
        userId: user.id,
        tier: 'active',
        keyPrefix: `stories/${slug}/`,
        expirySeconds: 7200,
      });
      return NextResponse.json({ token, tier: 'active', expiresIn: 7200 });
    }
  }

  // Fluxo normal: tier baseado na subscription do usuário.
  let tier: MediaTokenClaims['tier'] = 'free';
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data?.status === 'active' || data?.status === 'trialing') {
      tier = data.status;
    }
  } catch {
    /* tabela ausente — tier fica 'free' */
  }

  // Admin override — operadores em ADMIN_EMAILS sempre full access.
  if (tier === 'free' && isAdminEmail(user.email)) {
    tier = 'active';
  }

  const expirySeconds = 7200;
  const token = await signMediaToken({ userId: user.id, tier, expirySeconds });

  return NextResponse.json({ token, tier, expiresIn: expirySeconds });
}

type FreeProbe = {
  isFree: boolean;
  reason: 'ok' | 'env-missing' | 'exception' | 'not-found' | 'not-free';
  detail?: string;
};

/**
 * Resolve uma story por slug e devolve isFree + diagnóstico pra debug.
 * Usa service role pra não depender de RLS. Falhas detalhadas vêm em
 * `reason` (só vazadas no response quando ?debug=1).
 */
async function loadFreeStoryDetailed(slug: string): Promise<FreeProbe> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { isFree: false, reason: 'env-missing' };
  }
  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('stories')
      .select('is_free')
      .eq('slug', slug)
      .maybeSingle();
    if (error) {
      return { isFree: false, reason: 'exception', detail: error.message };
    }
    if (!data) {
      return { isFree: false, reason: 'not-found' };
    }
    if (!data.is_free) {
      return { isFree: false, reason: 'not-free' };
    }
    return { isFree: true, reason: 'ok' };
  } catch (err) {
    return { isFree: false, reason: 'exception', detail: String(err) };
  }
}
