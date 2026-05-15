import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ChapterReader } from '@/components/reader/ChapterReader';
import { ScriptReader } from '@/components/reader/ScriptReader';
import { getStoryBySlug } from '@/lib/data/stories-server';
import { getStoryScript, listEbookImageKeys, type Locale } from '@/lib/data/scripts-server';
import { ebookPages } from '@/lib/data/ebook';
import { groupIntoChapters } from '@/lib/data/chapters';
import { getUser, getSubscriptionTier, storyRequiresUpgrade } from '@/lib/auth-helpers';
import { signMediaToken } from '@/lib/media-token';

export const dynamic = 'force-dynamic';

const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'de', 'fr', 'es'] as const;

export default async function ReadPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const story = await getStoryBySlug(slug);
  if (!story) notFound();

  // Paywall unificado — story.isFree libera leitura pra qualquer um.
  // Quando requires upgrade: anon → login, logado free → /account.
  const [user, userTier] = await Promise.all([getUser(), getSubscriptionTier()]);
  const needsUpgrade = storyRequiresUpgrade(story, userTier);

  if (needsUpgrade) {
    if (!user) {
      redirect(`/${locale}/login?returnTo=${encodeURIComponent(`/${locale}/s/${slug}/read`)}`);
    }
    const from = `/${locale}/s/${slug}`;
    redirect(`/${locale}/account?upgrade=required&from=${encodeURIComponent(from)}`);
  }

  // Prioridade 1: roteiro novo (markdown + galeria). Se a locale do usuário
  // não tiver texto, getStoryScript faz fallback pro EN automaticamente.
  const readerLocale: Locale = (SUPPORTED_LOCALES as readonly string[]).includes(locale)
    ? (locale as Locale)
    : 'en';
  const script = await getStoryScript(slug, readerLocale);

  if (script) {
    // Assina token de mídia (mesmo padrão de /api/media/sign-token).
    // Free story + anon: usa userId sintético + keyPrefix scoped pra essa
    // story só (matching o que /api/media/sign-token devolve).
    const token = await signMediaToken({
      userId: user?.id ?? `anon:${slug}`,
      tier: 'active', // já passamos pelo paywall
      keyPrefix: story.isFree ? `stories/${slug}/` : undefined,
      expirySeconds: 7200,
    });
    const mediaDomain = process.env.NEXT_PUBLIC_MEDIA_DOMAIN ?? '';
    const keys = listEbookImageKeys(slug, story.ebookImageCount ?? 0);
    const imageUrls = mediaDomain
      ? keys.map((k) => `https://${mediaDomain}/${k}?token=${token}`)
      : [];

    return (
      <ScriptReader
        storyTitle={story.title}
        storyCover={story.cover}
        storySlug={story.slug}
        locale={locale}
        script={script.content}
        imageUrls={imageUrls}
        scriptLocale={script.locale}
        isFallback={script.locale !== readerLocale}
      />
    );
  }

  // Prioridade 2: PDF legado — manda pra preview nativo do browser com
  // token assinado (mesmo padrão da prioridade 1). Sem token o worker
  // de mídia responde 401 "Missing token".
  if (story.ebookKey) {
    const token = await signMediaToken({
      userId: user?.id ?? `anon:${slug}`,
      tier: 'active', // já passamos pelo paywall acima
      keyPrefix: story.isFree ? `stories/${slug}/` : undefined,
      expirySeconds: 7200,
    });
    redirect(
      `https://${process.env.NEXT_PUBLIC_MEDIA_DOMAIN}/${story.ebookKey}?token=${token}`,
    );
  }

  // Prioridade 3: ebook hardcoded compat (stories antigas com has_ebook=true
  // mas sem script novo nem PDF). Quando hasEbook é false → notFound.
  if (!story.hasEbook) notFound();
  const { cover, chapters, final, totalWords } = groupIntoChapters(ebookPages);
  return (
    <ChapterReader
      story={story}
      cover={cover}
      chapters={chapters}
      final={final}
      totalWords={totalWords}
    />
  );
}
