import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getStoryBySlug } from '@/lib/data/stories-server';
import { getAllScriptsForStory, listEbookImageKeys, type Locale } from '@/lib/data/scripts-server';
import { authors as hardcodedAuthors } from '@/lib/data/authors';
import { createServiceClient } from '@/lib/supabase/server';
import { getUser, isAdminEmail } from '@/lib/auth-helpers';
import { signMediaToken } from '@/lib/media-token';
import { PageHead } from '@/components/admin/AdminUI';
import { EditStoryForm } from '@/components/admin/EditStoryForm';

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function loadAuthors() {
  if (!SUPABASE_CONFIGURED) return hardcodedAuthors;
  try {
    const sb = createServiceClient();
    const { data } = await sb
      .from('authors')
      .select('id, name, tagline')
      .order('display_order', { ascending: true });
    if (!data || data.length === 0) return hardcodedAuthors;
    return data;
  } catch {
    return hardcodedAuthors;
  }
}

export default async function EditStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [story, authors, scriptsByLocale] = await Promise.all([
    getStoryBySlug(slug),
    loadAuthors(),
    getAllScriptsForStory(slug),
  ]);
  if (!story) notFound();

  // Imagens da galeria do ebook — admin sempre tier=active via isAdminEmail.
  // O token tem TTL longo (2h) que vale a sessão de edição inteira.
  const imageKeys = listEbookImageKeys(slug, story.ebookImageCount ?? 0);
  const mediaDomain = process.env.NEXT_PUBLIC_MEDIA_DOMAIN ?? '';
  let imageUrls: string[] = [];
  if (imageKeys.length > 0 && mediaDomain) {
    const user = await getUser();
    if (user && isAdminEmail(user.email)) {
      const token = await signMediaToken({
        userId: user.id,
        tier: 'active',
        expirySeconds: 7200,
      });
      imageUrls = imageKeys.map(
        (k) => `https://${mediaDomain}/${k}?token=${token}`,
      );
    }
  }

  const initialScripts: Partial<Record<Locale, string>> = {};
  (['en', 'de', 'fr', 'es'] as const).forEach((l) => {
    const s = scriptsByLocale[l];
    if (s) initialScripts[l] = s.content;
  });

  return (
    <>
      <Link
        href="/admin/stories"
        className="inline-flex items-center gap-1.5 text-text-dim hover:text-white text-[13px] font-bold uppercase tracking-wider mb-4 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Voltar para stories
      </Link>
      <PageHead
        title="Editar story"
        subtitle={`/s/${story.slug} · id ${story.id}`}
      />
      <EditStoryForm
        story={{
          slug: story.slug,
          title: story.title,
          synopsis: story.synopsis,
          genre: story.genre,
          totalMinutes: story.totalMinutes ?? 45,
          isFree: !!story.isFree,
          isHot: !!story.isHot,
          isPremium: !!story.isPremium,
          isComingSoon: !!story.isComingSoon,
          hasEbook: !!story.hasEbook,
          coverKey: story.coverKey ?? null,
          coverUrl: story.cover,
          videoKey: story.videoKey ?? null,
          audioKeys: story.audioKeyByLocale ?? {},
          ebookKey: story.ebookKey ?? null,
          ebookImageUrls: imageUrls,
          initialScripts,
        }}
        authors={authors.map((a) => ({
          id: a.id,
          name: a.name,
          tagline: a.tagline,
        }))}
      />
    </>
  );
}
