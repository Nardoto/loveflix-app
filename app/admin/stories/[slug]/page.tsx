import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getStoryBySlug } from '@/lib/data/stories-server';
import { authors as hardcodedAuthors } from '@/lib/data/authors';
import { createServiceClient } from '@/lib/supabase/server';
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
  const story = await getStoryBySlug(slug);
  if (!story) notFound();

  const authors = await loadAuthors();

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
