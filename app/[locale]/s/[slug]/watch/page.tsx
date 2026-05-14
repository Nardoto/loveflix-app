import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Player } from '@/components/player/Player';
import { getStoryBySlug } from '@/lib/data/stories-server';
import { getUser, getSubscriptionTier, storyRequiresUpgrade } from '@/lib/auth-helpers';

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

  // Paywall unificado — usa storyRequiresUpgrade pra respeitar story.isFree.
  // Story free passa direto (anônimo incluso); o Player resolve o token via
  // /api/media/sign-token?slug=… (rota aceita anon em free story).
  const [user, userTier] = await Promise.all([getUser(), getSubscriptionTier()]);
  const needsUpgrade = storyRequiresUpgrade(story, userTier);

  if (needsUpgrade) {
    if (!user) {
      const target = `/${locale}/s/${slug}/watch${mode ? `?mode=${mode}` : ''}`;
      redirect(`/${locale}/login?returnTo=${encodeURIComponent(target)}`);
    }
    const from = `/${locale}/s/${slug}`;
    redirect(`/${locale}/account?upgrade=required&from=${encodeURIComponent(from)}`);
  }

  const initialMode = mode === 'video' ? 'video' : 'audio';

  return <Player story={story} initialMode={initialMode} initialLocale={locale} />;
}
