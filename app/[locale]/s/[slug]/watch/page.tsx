import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Player } from '@/components/player/Player';
import { getStoryBySlug } from '@/lib/data/stories-server';
import { getUser, isSubscriber } from '@/lib/auth-helpers';

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { locale, slug } = await params;
  const { mode } = await searchParams;
  setRequestLocale(locale);

  const story = await getStoryBySlug(slug);
  if (!story) notFound();
  if (!story.videoSrc && !story.audioByLocale && !story.videoKey && !story.audioKeyByLocale) notFound();

  // Auth gate — anyone can browse the catalog and read synopses, but watching
  // requires a signed-in account. Redirect guests to /login with a returnTo so
  // they land back on this player after authenticating.
  const user = await getUser();
  if (!user) {
    const target = `/${locale}/s/${slug}/watch${mode ? `?mode=${mode}` : ''}`;
    redirect(`/${locale}/login?returnTo=${encodeURIComponent(target)}`);
  }

  // Premium gate — story marcada is_premium e não-free exige assinatura
  // active/trialing. Admin emails entram (ver isSubscriber). Sem isso, o
  // Player carregaria e só falharia em /api/media/sign-token; mais cedo é
  // melhor.
  if (story.isPremium && !story.isFree) {
    const sub = await isSubscriber();
    if (!sub) {
      const from = `/${locale}/s/${slug}`;
      redirect(`/${locale}/account?upgrade=required&from=${encodeURIComponent(from)}`);
    }
  }

  const initialMode = mode === 'video' ? 'video' : 'audio';

  return <Player story={story} initialMode={initialMode} initialLocale={locale} />;
}
