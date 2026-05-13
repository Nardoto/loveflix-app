import Image from 'next/image';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';

// Defensa contra cache estático: o page já é dinâmico de fato (lê cookies via
// getUser e consulta Supabase a cada request), mas marcar explicitamente
// garante que o Vercel/Next nunca sirva uma versão pré-renderizada — o que
// faria comentários novos sumirem no F5 logo após o post.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Play, Headphones, BookOpen, Star, Clock, Clock3, Languages, ArrowLeft, Download, Crown } from 'lucide-react';
import { Link } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Row } from '@/components/catalog/Row';
import { getStoryBySlug, getStoriesByGenre } from '@/lib/data/stories-server';
import { getCommentsForStory } from '@/lib/data/comments-server';
import { getUser, getSubscriptionTier, storyRequiresUpgrade } from '@/lib/auth-helpers';
import { StoryComments } from '@/components/story/StoryComments';
import { FavoriteAddButton } from '@/components/story/FavoriteToggle';
import { isFavorite } from '@/lib/data/favorites-server';
import { isStoryHot } from '@/lib/data/hot';
import { FlameIcon } from '@/components/icons/FlameIcon';
import { SparkleIcon } from '@/components/icons/SparkleIcon';

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const tStory = await getTranslations('story');
  const tGenre = await getTranslations('genres');
  const tPaywall = await getTranslations('paywall');

  const story = await getStoryBySlug(slug);
  if (!story) notFound();

  const hasVideo = !!(story.videoSrc || story.videoKey);
  const hasAudio = !!(story.audioByLocale || story.audioKeyByLocale);
  const hasEbook = !!story.hasEbook;
  const ebookDownloadUrl = story.ebookKey
    ? `https://${process.env.NEXT_PUBLIC_MEDIA_DOMAIN}/${story.ebookKey}`
    : null;
  const hasAnyMedia = hasVideo || hasAudio || hasEbook;

  // Comments + aggregate rating. Tries Supabase first; falls back to seeded
  // mocks when (a) env vars are missing, (b) the schema hasn't been run yet,
  // or (c) the story has fewer than 3 real comments — then we mix mocks in
  // to avoid an empty page. See lib/data/comments-server.ts for the merge rules.
  const [{ comments: storyComments, ratingAvg, ratingCount }, currentUser] =
    await Promise.all([getCommentsForStory(story), getUser()]);

  // Favorito é per-user — só consulta se a usuária está logada. Para
  // anônimos, o botão fica como "+" e o click leva pro login.
  const isFav = currentUser ? await isFavorite(currentUser.id, slug) : false;

  // Paywall global: qualquer não-assinante (anônimo incluído) cai no CTA
  // de upgrade quando tenta watch/listen/download. Coming Soon segue
  // próprio fluxo (sem media pra reproduzir).
  const userTier = await getSubscriptionTier();
  const needsUpgrade = storyRequiresUpgrade(story, userTier);
  const upgradeHref =
    `/account?upgrade=required&from=/${locale}/s/${story.slug}` as const;

  // "More like this" — same genre, different stories.
  const related = (await getStoriesByGenre(story.genre))
    .filter((s) => s.id !== story.id)
    .slice(0, 12);

  return (
    <>
      {/* Cinematic hero. min-h em vez de h fixo: se o conteúdo crescer
          (título de 3 linhas + sinopse + botões), a section se estende
          em vez de cortar os elementos pra cima do topbar. overflow-hidden
          mantido só pro scale-105 do Image não vazar. */}
      <section className="relative min-h-[70vh] md:min-h-[80vh] w-full overflow-hidden">
        <Image
          src={story.cover}
          alt={story.title}
          fill
          priority
          sizes="100vw"
          className="object-cover scale-105"
        />
        <div className="absolute inset-0 hero-overlay" />

        {/* Back button — top-left, separado do topbar pra 55+ ter um
            "voltar" óbvio sem precisar do back do navegador. */}
        <Link
          href="/"
          aria-label={tStory('back')}
          className="absolute top-20 md:top-24 left-4 md:left-8 z-30 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white text-[12px] font-bold transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">{tStory('back')}</span>
        </Link>

        {/* Conteúdo flui de cima pra baixo a partir do pt-28 (espaço pro
            topbar h-16/18 + folga do botão Voltar). Sem h-full / justify-end
            que antes forçavam stack pro fim e vazavam pra cima quando
            o conteúdo não cabia. */}
        <div className="relative pt-28 md:pt-32 pb-16 md:pb-24 px-5 md:px-10 lg:px-14 max-w-3xl">
          <div className="flex items-center gap-2 mb-3 md:mb-4 flex-wrap">
            {story.isComingSoon && (
              <Badge variant="comingSoon">
                <Clock3 className="size-3" />
                {t('comingSoon')}
              </Badge>
            )}
            {!story.isComingSoon && isStoryHot(story) && (
              <Badge variant="hot">
                <FlameIcon className="size-3" />
                {tStory('hot')}
              </Badge>
            )}
            {story.isFree && (
              <Badge variant="free">
                <SparkleIcon className="size-3" />
                {tStory('freeToListen')}
              </Badge>
            )}
            <span className="text-[11px] md:text-xs font-bold uppercase tracking-[0.25em] text-gold-bright">
              {tGenre(story.genre as never)}
            </span>
          </div>

          {/* Title — capped at text-5xl and 3 lines so super-long titles
              (e.g. "Chosen by Spain's Most Feared Tycoon for Revenge — But
              He Craved Her Every Night") don't overflow the hero and bleed
              behind the top bar. text-balance distributes the wrap evenly. */}
          <h1
            className="font-serif italic font-black text-2xl sm:text-4xl md:text-5xl text-white leading-[1.1] tracking-tight mb-4 drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] line-clamp-3 text-balance"
            title={story.title}
          >
            {story.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-text-dim mb-5 flex-wrap">
            {story.totalMinutes && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" />
                {story.totalMinutes} min
              </span>
            )}
            {story.ageRating && (
              <span className="flex items-center gap-1 text-gold">
                <Star className="size-4 fill-current" />
                {story.ageRating}
              </span>
            )}
            <span className="flex items-center gap-1 text-gold-bright">
              <Star className="size-4 fill-current" />
              {ratingAvg.toFixed(1)} ({tStory('reviewsCount', { count: ratingCount })})
            </span>
            {hasAudio && (
              <span className="flex items-center gap-1.5">
                <Languages className="size-4" />
                {tStory('languages', { count: 4 })}
              </span>
            )}
          </div>

          <p className="text-base md:text-lg text-text-soft/95 max-w-2xl leading-relaxed mb-6">
            {story.synopsis}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {needsUpgrade ? (
              // Premium-only: substitui Watch/Listen/Read por um único CTA
              // dourado de assinatura. Mantém o botão de favoritar pra que
              // a usuária consiga salvar pra depois.
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-gold-bright to-gold text-bg-deep hover:brightness-105"
              >
                <Link href={upgradeHref as never}>
                  <Crown />
                  {tPaywall('lockedButton')}
                </Link>
              </Button>
            ) : (
              <>
                {hasVideo ? (
                  <Button asChild size="lg">
                    <Link href={`/s/${story.slug}/watch?mode=video` as never}>
                      <Play className="fill-current" />
                      {tStory('watch')}
                    </Link>
                  </Button>
                ) : (
                  <Button size="lg" variant="glass" disabled>
                    <Play className="fill-current" />
                    {tStory('watchComingSoon')}
                  </Button>
                )}

                {hasAudio && (
                  <Button asChild size="lg" variant="glass">
                    <Link href={`/s/${story.slug}/watch?mode=audio` as never}>
                      <Headphones />
                      {tStory('listen')}
                    </Link>
                  </Button>
                )}

                {hasEbook && ebookDownloadUrl ? (
                  <Button asChild size="lg" variant="glass">
                    <a
                      href={ebookDownloadUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download />
                      {tStory('downloadPdf')}
                    </a>
                  </Button>
                ) : hasEbook ? (
                  <Button asChild size="lg" variant="glass">
                    <Link href={`/s/${story.slug}/read` as never}>
                      <BookOpen />
                      {tStory('read')}
                    </Link>
                  </Button>
                ) : null}
              </>
            )}

            <FavoriteAddButton
              storySlug={story.slug}
              initial={isFav}
              loginReturnTo={`/${locale}/s/${story.slug}`}
            />
          </div>

          {needsUpgrade && (
            <div className="mt-6 text-sm text-gold-bright bg-gold/10 border border-gold/30 rounded-xl px-4 py-3 max-w-lg">
              <strong className="font-bold flex items-center gap-1.5 mb-1">
                <Crown className="size-4" />
                {tPaywall('requiredTitle')}
              </strong>
              {tPaywall('requiredDesc')}
            </div>
          )}

          {!hasAnyMedia && !needsUpgrade && (
            <div className="mt-6 text-sm text-gold-bright bg-gold/15 rounded-xl px-4 py-3 max-w-md">
              <strong className="font-bold">{tStory('comingSoonTitle')}</strong> {tStory('comingSoonDesc')}
            </div>
          )}
        </div>
      </section>

      {/* Tropes / details */}
      <section className="px-5 md:px-10 lg:px-14 mt-12 md:mt-16 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-mute mb-2">
              {tStory('tropes')}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {story.tropes.map((trope) => (
                <Badge key={trope} variant="genre">
                  {trope}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-mute mb-2">
              {tStory('genre')}
            </h3>
            <p className="font-serif italic text-rose-bright text-lg">
              {tGenre(story.genre as never)}
            </p>
          </div>
        </div>
      </section>

      <StoryComments
        storyId={story.id}
        storyTitle={story.title}
        storySlug={story.slug}
        comments={storyComments}
        initialAverage={ratingAvg}
        initialCount={ratingCount}
        isComingSoon={!!story.isComingSoon}
        isSignedIn={!!currentUser}
        currentUserId={currentUser?.id ?? null}
        currentUserName={
          (currentUser?.user_metadata?.full_name as string | undefined) ||
          (currentUser?.user_metadata?.name as string | undefined) ||
          (currentUser?.email ? currentUser.email.split('@')[0] : null)
        }
        currentUserAvatar={
          (currentUser?.user_metadata?.avatar_url as string | undefined) ||
          (currentUser?.user_metadata?.picture as string | undefined) ||
          null
        }
      />

      {related.length > 0 && (
        <Row title={tStory('moreLikeThis')} highlight={tStory('moreLikeThisHighlight')} stories={related} userTier={userTier} />
      )}
    </>
  );
}
