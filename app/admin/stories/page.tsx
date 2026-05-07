import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getAllStories } from '@/lib/data/stories-server';
import { Button } from '@/components/ui/button';
import { PageHead, Pill, Table, Th } from '@/components/admin/AdminUI';

export default async function AdminStoriesPage() {
  const stories = await getAllStories();

  const live = stories.filter((s) => s.videoSrc || s.videoKey);
  const coming = stories.filter((s) => s.isComingSoon);
  const drafts = stories.filter(
    (s) => !s.videoSrc && !s.videoKey && !s.isComingSoon,
  );

  return (
    <>
      <PageHead
        title="Stories"
        subtitle={`${stories.length} no catálogo · ${live.length} publicadas · ${coming.length} coming soon · ${drafts.length} rascunhos`}
        actions={
          <Button variant="rose" size="sm" asChild>
            <Link href="/admin/stories/new">
              <Plus className="size-4" /> Nova Story
            </Link>
          </Button>
        }
      />

      <Table
        head={
          <>
            <Th>Título</Th>
            <Th className="hidden md:table-cell">Gênero</Th>
            <Th>Status</Th>
            <Th className="hidden lg:table-cell">Idiomas</Th>
            <Th className="hidden lg:table-cell">Ebook</Th>
            <Th className="text-right">Ações</Th>
          </>
        }
      >
        {stories.map((s) => {
          const langs = Object.keys(
            s.audioKeyByLocale ?? s.audioByLocale ?? {},
          );
          return (
            <tr key={s.id} className="cursor-pointer">
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-[44px] h-[28px] rounded-md shrink-0 bg-gradient-to-br from-burgundy to-bg-deep" />
                  <div className="min-w-0">
                    <p className="font-serif italic font-bold text-[13.5px] text-white truncate max-w-[360px]">
                      {s.title}
                    </p>
                    <p className="text-[11px] text-text-mute mt-0.5 truncate max-w-[360px]">
                      /s/{s.slug}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5 capitalize text-text-dim hidden md:table-cell">
                {s.genre.replace('_', ' ')}
              </td>
              <td className="px-4 py-3.5">
                {s.videoKey || s.videoSrc ? (
                  <Pill tone="published">Publicada</Pill>
                ) : s.isComingSoon ? (
                  <Pill tone="coming">Coming Soon</Pill>
                ) : (
                  <Pill tone="draft">Rascunho</Pill>
                )}
              </td>
              <td className="px-4 py-3.5 text-text-dim text-[12px] hidden lg:table-cell">
                {langs.length > 0 ? `${langs.length}/4` : '—'}
              </td>
              <td className="px-4 py-3.5 text-text-dim text-[12px] hidden lg:table-cell">
                {s.hasEbook ? '✓' : '—'}
              </td>
              <td className="px-4 py-3.5 text-right">
                <Button variant="glass" size="sm" asChild>
                  <Link href={`/admin/stories/${s.slug}`}>Editar</Link>
                </Button>
              </td>
            </tr>
          );
        })}
      </Table>

      <p className="text-[11px] text-text-mute mt-4">
        Catálogo carregado do Supabase quando populado, com fallback pra
        <code className="font-mono">lib/data/stories.ts</code> em deploy
        fresco. Rode <code className="font-mono">node scripts/seed-stories.mjs</code>{' '}
        pra migrar o catálogo hardcoded pro banco.
      </p>
    </>
  );
}
