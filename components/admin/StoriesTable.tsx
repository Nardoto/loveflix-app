'use client';

// Lista de stories no estilo YouTube Studio. Server Component pai
// (app/admin/stories/page.tsx) traz stories + métricas; este componente
// faz sort/busca/filtro/bulk client-side. Sort default: data desc.
//
// Por que client-side: a lista cabe em memória (centenas, não milhões),
// e os reads do banco já estão atrás de unstable_cache. Filtrar no cliente
// dá feedback instantâneo no input — o que é exatamente como o YT faz.

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  ExternalLink,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Star,
  MessageCircle,
  X,
  CheckSquare,
  Square,
  Loader2,
  Clock,
} from 'lucide-react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/admin/AdminUI';
import type { Story } from '@/lib/data/stories';
import type { StoryMetrics } from '@/lib/data/stories-server';
import {
  bulkPublish,
  bulkUnpublish,
  bulkDelete,
  publishStory,
  unpublishStory,
  deleteStory,
} from '@/app/actions/admin-stories';

type Filter = 'all' | 'published' | 'coming' | 'draft';
type SortKey = 'date' | 'reviews' | 'comments';
type SortDir = 'asc' | 'desc';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'published', label: 'Publicadas' },
  { id: 'coming', label: 'Coming Soon' },
  { id: 'draft', label: 'Rascunhos' },
];

const GENRE_LABEL: Record<string, string> = {
  mafia: 'Mafia',
  billionaire: 'Billionaire',
  forbidden: 'Forbidden',
  secret_baby: 'Secret Baby',
  second_chance: 'Second Chance',
  arranged: 'Arranged',
  royal: 'Royal',
  mood: 'Mood',
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusOf(s: Story): Filter {
  if (s.videoSrc || s.videoKey) return 'published';
  if (s.isComingSoon) return 'coming';
  return 'draft';
}

export function StoriesTable({
  stories,
  metrics,
}: {
  stories: Story[];
  metrics: Record<string, StoryMetrics>;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Filter → search → sort. Fluxo limpo, parece pesado mas com 200-500
  // stories roda em <1ms.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = stories.filter((s) => {
      if (filter !== 'all' && statusOf(s) !== filter) return false;
      if (q) {
        const hay = `${s.title} ${s.slug} ${s.genre}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') {
        const da = a.publishedAt || a.createdAt || '';
        const db = b.publishedAt || b.createdAt || '';
        cmp = da < db ? -1 : da > db ? 1 : 0;
      } else if (sortKey === 'reviews') {
        cmp = (metrics[a.slug]?.avgRating ?? 0) - (metrics[b.slug]?.avgRating ?? 0);
      } else {
        cmp = (metrics[a.slug]?.commentCount ?? 0) - (metrics[b.slug]?.commentCount ?? 0);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [stories, filter, search, sortKey, sortDir, metrics]);

  const counts = useMemo(() => {
    const c = { all: stories.length, published: 0, coming: 0, draft: 0 };
    for (const s of stories) c[statusOf(s)] += 1;
    return c;
  }, [stories]);

  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(s.slug));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const s of visible) next.delete(s.slug);
      } else {
        for (const s of visible) next.add(s.slug);
      }
      return next;
    });
  };

  const toggleOne = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const runBulk = (action: 'publish' | 'unpublish' | 'delete') => {
    const slugs = Array.from(selected);
    if (slugs.length === 0) return;
    if (action === 'delete') {
      if (
        !confirm(
          `Apagar ${slugs.length} stor${slugs.length === 1 ? 'y' : 'ies'} pra sempre? R2 também é limpo.`,
        )
      )
        return;
    }
    setError(null);
    startTransition(async () => {
      const fn = action === 'publish' ? bulkPublish : action === 'unpublish' ? bulkUnpublish : bulkDelete;
      const res = await fn(slugs);
      if (res.ok) {
        setSelected(new Set());
      } else {
        setError(res.error);
      }
    });
  };

  const runRow = (action: 'publish' | 'unpublish' | 'delete', slug: string, title: string) => {
    if (action === 'delete') {
      if (!confirm(`Apagar "${title}"? R2 também é limpo.`)) return;
    }
    setError(null);
    startTransition(async () => {
      const fn =
        action === 'publish' ? publishStory : action === 'unpublish' ? unpublishStory : deleteStory;
      const res = await fn(slug);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className="space-y-4">
      {/* Search + filter pills */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-mute pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, slug ou gênero…"
            className="input pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-7 grid place-items-center text-text-mute hover:text-white rounded-full hover:bg-white/[0.06]"
              aria-label="Limpar busca"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const n = counts[f.id];
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={[
                  'px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors inline-flex items-center gap-1.5',
                  active
                    ? 'bg-rose text-white'
                    : 'bg-bg-card text-text-dim hover:text-white border border-white/[0.06]',
                ].join(' ')}
              >
                {f.label}
                <span className={active ? 'opacity-80' : 'opacity-60'}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Bulk action bar — desliza do bottom como YouTube */}
      {selected.size > 0 && (
        <div className="sticky top-4 z-30 flex items-center gap-3 bg-bg-card/95 backdrop-blur-xl border border-rose/30 rounded-xl px-4 py-2.5 shadow-2xl shadow-rose/10">
          <span className="text-[13px] font-bold text-white">
            {selected.size} {selected.size === 1 ? 'selecionada' : 'selecionadas'}
          </span>
          <span className="flex-1" />
          <Button
            size="sm"
            variant="glass"
            onClick={() => runBulk('publish')}
            disabled={pending}
          >
            <Eye className="size-3.5" /> Publicar
          </Button>
          <Button
            size="sm"
            variant="glass"
            onClick={() => runBulk('unpublish')}
            disabled={pending}
          >
            <EyeOff className="size-3.5" /> Tirar do ar
          </Button>
          <Button
            size="sm"
            variant="glass"
            onClick={() => runBulk('delete')}
            disabled={pending}
            className="text-red-300 hover:text-red-200"
          >
            <Trash2 className="size-3.5" /> Apagar
          </Button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="size-7 grid place-items-center text-text-mute hover:text-white rounded-full hover:bg-white/[0.06]"
            aria-label="Limpar seleção"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl bg-bg-card border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[1080px]">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-[0.18em] text-text-mute border-b border-white/[0.06]">
                <th className="px-3 py-3 w-[44px]">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="size-4 grid place-items-center text-text-mute hover:text-white"
                    aria-label="Selecionar todos visíveis"
                  >
                    {allVisibleSelected ? (
                      <CheckSquare className="size-4 text-rose-bright" />
                    ) : (
                      <Square className="size-4" />
                    )}
                  </button>
                </th>
                <th className="px-2 py-3">Vídeo</th>
                <th className="px-3 py-3 hidden md:table-cell">Visibilidade</th>
                <th className="px-3 py-3 hidden xl:table-cell">Restrições</th>
                <th className="px-3 py-3 hidden md:table-cell">
                  <SortHead label="Data" active={sortKey === 'date'} dir={sortDir} onClick={() => onSort('date')} />
                </th>
                <th className="px-3 py-3 hidden lg:table-cell">Idiomas</th>
                <th className="px-3 py-3 hidden lg:table-cell">Ebook</th>
                <th className="px-3 py-3 hidden md:table-cell">
                  <SortHead label="Reviews" active={sortKey === 'reviews'} dir={sortDir} onClick={() => onSort('reviews')} />
                </th>
                <th className="px-3 py-3 hidden md:table-cell">
                  <SortHead label="Coments." active={sortKey === 'comments'} dir={sortDir} onClick={() => onSort('comments')} />
                </th>
                <th className="px-3 py-3 hidden xl:table-cell">Views</th>
                <th className="px-3 py-3 w-[40px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-text-dim">
                    Nada encontrado nesse filtro.
                  </td>
                </tr>
              ) : (
                visible.map((s) => {
                  const m = metrics[s.slug];
                  const langs = Object.keys(s.audioKeyByLocale ?? s.audioByLocale ?? {});
                  const isSelected = selected.has(s.slug);
                  const isPublished = !!(s.videoSrc || s.videoKey);
                  return (
                    <tr
                      key={s.id}
                      className={[
                        'group transition-colors',
                        isSelected ? 'bg-rose/[0.05]' : 'hover:bg-white/[0.02]',
                      ].join(' ')}
                    >
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => toggleOne(s.slug)}
                          className="size-4 grid place-items-center text-text-mute hover:text-white"
                          aria-label="Selecionar"
                        >
                          {isSelected ? (
                            <CheckSquare className="size-4 text-rose-bright" />
                          ) : (
                            <Square className="size-4" />
                          )}
                        </button>
                      </td>

                      {/* Vídeo: thumb + título + slug + sinopse */}
                      <td className="px-2 py-3">
                        <div className="flex gap-3 min-w-0 max-w-[440px]">
                          <Link
                            href={`/admin/stories/${s.slug}`}
                            className="relative shrink-0 w-[120px] h-[68px] rounded-md overflow-hidden bg-bg-deep ring-1 ring-white/10 group-hover:ring-rose-bright/40 transition-all"
                          >
                            <Image
                              src={s.cover}
                              alt=""
                              fill
                              sizes="120px"
                              className="object-cover"
                              unoptimized
                            />
                            {/* Duração overlay (estilo YouTube) */}
                            {s.totalMinutes && (
                              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-white text-[10px] font-bold">
                                {s.totalMinutes}min
                              </span>
                            )}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/admin/stories/${s.slug}`}
                              className="block font-serif italic font-bold text-[14px] text-white leading-snug line-clamp-2 hover:text-rose-bright transition-colors"
                            >
                              {s.title}
                            </Link>
                            <p className="text-[11px] text-text-mute mt-0.5 truncate">
                              /s/{s.slug}
                            </p>
                            <p className="text-[11px] text-text-dim mt-1 line-clamp-1">
                              {s.synopsis}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 hidden md:table-cell whitespace-nowrap">
                        {isPublished ? (
                          <Pill tone="published">Publicada</Pill>
                        ) : s.isComingSoon ? (
                          <Pill tone="coming">Coming Soon</Pill>
                        ) : (
                          <Pill tone="draft">Rascunho</Pill>
                        )}
                      </td>

                      <td className="px-3 py-3 text-text-mute text-[12px] hidden xl:table-cell">
                        Nenhuma
                      </td>

                      <td className="px-3 py-3 hidden md:table-cell whitespace-nowrap">
                        <div className="text-[12px] text-text-soft">{formatDate(s.publishedAt ?? s.createdAt)}</div>
                        <div className="text-[10px] text-text-mute mt-0.5">
                          {s.publishedAt ? 'Publicado' : s.createdAt ? 'Criado' : '—'}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-text-dim text-[12px] hidden lg:table-cell whitespace-nowrap">
                        {langs.length > 0 ? `${langs.length}/4` : '—'}
                      </td>

                      <td className="px-3 py-3 text-text-dim text-[12px] hidden lg:table-cell">
                        {s.ebookKey ? (
                          <span className="text-emerald-300">PDF</span>
                        ) : s.hasEbook ? (
                          <span className="text-amber-300">flag</span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="px-3 py-3 hidden md:table-cell whitespace-nowrap">
                        {m && m.ratedCount > 0 ? (
                          <div className="inline-flex items-center gap-1 text-[12px]">
                            <Star className="size-3 text-gold-bright fill-current" />
                            <span className="text-white font-bold">{m.avgRating.toFixed(1)}</span>
                            <span className="text-text-mute">({m.ratedCount})</span>
                          </div>
                        ) : (
                          <span className="text-text-mute text-[12px]">—</span>
                        )}
                      </td>

                      <td className="px-3 py-3 hidden md:table-cell whitespace-nowrap">
                        {m && m.commentCount > 0 ? (
                          <div className="inline-flex items-center gap-1 text-[12px]">
                            <MessageCircle className="size-3 text-text-dim" />
                            <span className="text-white">{m.commentCount}</span>
                          </div>
                        ) : (
                          <span className="text-text-mute text-[12px]">—</span>
                        )}
                      </td>

                      <td className="px-3 py-3 hidden xl:table-cell whitespace-nowrap">
                        <div
                          className="inline-flex items-center gap-1 text-[11px] text-text-mute"
                          title="Tracking de views ainda não implementado"
                        >
                          <Clock className="size-3" />
                          em breve
                        </div>
                      </td>

                      {/* Quick actions */}
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Ver no site — pill com texto, sempre visível.
                              Aparece em todas as stories: pra Coming Soon
                              também leva pra detail page (ainda dá pra ver
                              capa e sinopse, mesmo sem player). */}
                          <a
                            href={`/s/${s.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose/15 hover:bg-rose/25 text-rose-bright hover:text-white text-[12px] font-bold transition-colors"
                            title="Abrir no site (nova aba)"
                          >
                            <ExternalLink className="size-3.5" />
                            Ver
                          </a>
                          <Link
                            href={`/admin/stories/${s.slug}`}
                            className="size-7 grid place-items-center rounded-full text-text-dim hover:text-white hover:bg-white/[0.06] transition-colors"
                            title="Editar"
                            aria-label="Editar"
                          >
                            <Pencil className="size-3.5" />
                          </Link>
                          <Dropdown.Root>
                            <Dropdown.Trigger asChild>
                              <button
                                type="button"
                                aria-label="Mais opções"
                                className="size-7 grid place-items-center rounded-full text-text-dim hover:text-white hover:bg-white/[0.06] transition-colors"
                              >
                                <MoreVertical className="size-3.5" />
                              </button>
                            </Dropdown.Trigger>
                            <Dropdown.Portal>
                              <Dropdown.Content
                                align="end"
                                sideOffset={6}
                                className="min-w-[200px] rounded-xl bg-bg-elevated border border-white/[0.08] shadow-2xl shadow-black/60 p-1 z-50"
                              >
                                <DropItem asChild>
                                  <a
                                    href={`/s/${s.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="size-4" /> Ver no site
                                  </a>
                                </DropItem>
                                <DropItem asChild>
                                  <Link href={`/admin/stories/${s.slug}`}>
                                    <Pencil className="size-4" /> Editar
                                  </Link>
                                </DropItem>
                                <Dropdown.Separator className="h-px bg-white/[0.06] my-1" />
                                <DropItem
                                  onSelect={() =>
                                    runRow(isPublished ? 'unpublish' : 'publish', s.slug, s.title)
                                  }
                                >
                                  {isPublished ? (
                                    <>
                                      <EyeOff className="size-4" /> Tirar do ar
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="size-4" /> Publicar
                                    </>
                                  )}
                                </DropItem>
                                <Dropdown.Separator className="h-px bg-white/[0.06] my-1" />
                                <DropItem
                                  onSelect={() => runRow('delete', s.slug, s.title)}
                                  destructive
                                >
                                  <Trash2 className="size-4" /> Apagar
                                </DropItem>
                              </Dropdown.Content>
                            </Dropdown.Portal>
                          </Dropdown.Root>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-text-mute">
        {pending && (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" /> Aplicando…
          </span>
        )}
        {!pending && (
          <>
            {visible.length} de {stories.length} visíveis · clique nas colunas pra ordenar
          </>
        )}
      </p>
    </div>
  );
}

function SortHead({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1 transition-colors',
        active ? 'text-white' : 'hover:text-white',
      ].join(' ')}
    >
      {label}
      {active ? (
        dir === 'asc' ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-50" />
      )}
    </button>
  );
}

function DropItem({
  onSelect,
  destructive,
  asChild,
  children,
}: {
  onSelect?: () => void;
  destructive?: boolean;
  /** Renderiza o filho direto (pra <a>/<Link>) — Radix repassa props. */
  asChild?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Dropdown.Item
      onSelect={onSelect}
      asChild={asChild}
      className={[
        'flex items-center gap-2 px-3 py-2 text-[13px] rounded-lg cursor-pointer outline-none',
        destructive
          ? 'text-red-300 data-[highlighted]:bg-red-500/15 data-[highlighted]:text-red-200'
          : 'text-text-soft data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-white',
      ].join(' ')}
    >
      {children}
    </Dropdown.Item>
  );
}
