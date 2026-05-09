import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getAllStories, getStoryMetrics } from '@/lib/data/stories-server';
import { Button } from '@/components/ui/button';
import { PageHead } from '@/components/admin/AdminUI';
import { StoriesTable } from '@/components/admin/StoriesTable';

// Force dynamic — sempre fresca, sem cache de página. unstable_cache no
// getAllStories segura a query do Supabase, então esse force-dynamic só
// garante que invalidação rápida (revalidateTag) reflete no admin.
export const dynamic = 'force-dynamic';

export default async function AdminStoriesPage() {
  const [stories, metricsMap] = await Promise.all([
    getAllStories(),
    getStoryMetrics(),
  ]);

  const live = stories.filter((s) => s.videoSrc || s.videoKey).length;
  const coming = stories.filter((s) => s.isComingSoon).length;
  const drafts = stories.filter(
    (s) => !s.videoSrc && !s.videoKey && !s.isComingSoon,
  ).length;

  // Map → plain object: client component prop precisa ser serializável.
  const metrics = Object.fromEntries(metricsMap);

  return (
    <>
      <PageHead
        title="Stories"
        subtitle={`${stories.length} no catálogo · ${live} publicadas · ${coming} coming soon · ${drafts} rascunhos`}
        actions={
          <Button variant="rose" size="sm" asChild>
            <Link href="/admin/stories/new">
              <Plus className="size-4" /> Nova Story
            </Link>
          </Button>
        }
      />

      <StoriesTable stories={stories} metrics={metrics} />
    </>
  );
}
