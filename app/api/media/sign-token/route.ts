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
  const user = await getUser();
  if (!user) {
    // Permite anônimo APENAS se a chamada é pra uma story grátis.
    // Sem slug, mantemos o 401 histórico.
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    if (!slug) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const freeStory = await loadFreeStory(slug);
    if (!freeStory) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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

  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');

  // Logado em story free: também assina bypass scoped (pra não depender
  // da subscription do usuário pra liberar a amostra).
  if (slug) {
    const freeStory = await loadFreeStory(slug);
    if (freeStory) {
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

/**
 * Resolve uma story por slug e devolve true se `is_free=true`. Usa
 * service role pra não depender de RLS (read é público de qualquer
 * forma). Falhas viram null pra não vazar paywall por erro de leitura.
 */
async function loadFreeStory(slug: string): Promise<boolean> {
  try {
    const sb = createServiceClient();
    const { data } = await sb
      .from('stories')
      .select('is_free')
      .eq('slug', slug)
      .maybeSingle();
    return !!data?.is_free;
  } catch {
    return false;
  }
}
