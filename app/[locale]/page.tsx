// Sprint 0 placeholder — Hello World with i18n + Supabase ping.
// Sprint 1 replaces this with the real catalog home.

import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  // Ping Supabase (just to confirm connection works once envs are set)
  let supaStatus: 'ok' | 'unconfigured' | 'error' = 'unconfigured';
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.from('stories').select('id').limit(1);
      supaStatus = error ? 'error' : 'ok';
    } catch {
      supaStatus = 'error';
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-5xl md:text-7xl font-black italic bg-gradient-to-br from-rose-400 to-rose-700 bg-clip-text text-transparent mb-3">
        {t('app.name')}
      </h1>
      <p className="text-lg md:text-xl text-zinc-400 mb-12">{t('app.tagline')}</p>

      <div className="grid gap-3 text-sm">
        <StatusRow label="Next.js" ok={true} hint="Running" />
        <StatusRow
          label="Supabase"
          ok={supaStatus === 'ok'}
          hint={
            supaStatus === 'unconfigured'
              ? 'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
              : supaStatus === 'error'
              ? 'Connected but query failed (table missing? run migrations)'
              : 'Connected'
          }
        />
        <StatusRow
          label="Stripe"
          ok={!!process.env.STRIPE_SECRET_KEY}
          hint={process.env.STRIPE_SECRET_KEY ? 'Key set' : 'Add STRIPE_SECRET_KEY to .env.local'}
        />
        <StatusRow
          label="Bunny Stream"
          ok={!!process.env.BUNNY_API_KEY}
          hint={process.env.BUNNY_API_KEY ? 'Key set' : 'Add BUNNY_API_KEY to .env.local'}
        />
        <StatusRow
          label="PostHog"
          ok={!!process.env.NEXT_PUBLIC_POSTHOG_KEY}
          hint={
            process.env.NEXT_PUBLIC_POSTHOG_KEY
              ? 'Key set'
              : 'Add NEXT_PUBLIC_POSTHOG_KEY to .env.local'
          }
        />
      </div>

      <p className="mt-10 text-xs text-zinc-500">
        Sprint 0 — {locale.toUpperCase()} ·{' '}
        <a href="/en" className="hover:text-rose-400">EN</a> ·{' '}
        <a href="/de" className="hover:text-rose-400">DE</a> ·{' '}
        <a href="/fr" className="hover:text-rose-400">FR</a> ·{' '}
        <a href="/es" className="hover:text-rose-400">ES</a>
      </p>
    </main>
  );
}

function StatusRow({ label, ok, hint }: { label: string; ok: boolean; hint?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 min-w-[280px]">
      <span className={ok ? 'text-emerald-400' : 'text-amber-400'}>{ok ? '●' : '○'}</span>
      <span className="font-semibold w-24 text-left">{label}</span>
      <span className="text-zinc-500 text-xs text-left flex-1">{hint}</span>
    </div>
  );
}
