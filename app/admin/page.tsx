import Link from 'next/link';
import Image from 'next/image';
import { Plus, RefreshCw, Upload, FileText, MessageSquare, CreditCard } from 'lucide-react';
import { getAllStories } from '@/lib/data/stories-server';
import { createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { PRICE_IDS } from '@/lib/stripe';
import { getFxToUsd } from '@/lib/fx';
import {
  PageHead,
  Stat,
  StatGrid,
  Card,
  SectionHead,
  Pill,
  Table,
  Th,
} from '@/components/admin/AdminUI';

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mirrors the price-cents map in /admin/subscriptions so MRR math stays
// consistent across pages — if you change one, change the other.
const PRICE_CENTS: Record<string, { cents: number; currency: 'usd' | 'brl' | 'eur' }> = {};
if (PRICE_IDS.usd) PRICE_CENTS[PRICE_IDS.usd] = { cents: 1499, currency: 'usd' };
if (PRICE_IDS.brl) PRICE_CENTS[PRICE_IDS.brl] = { cents: 7990, currency: 'brl' };
if (PRICE_IDS.eur) PRICE_CENTS[PRICE_IDS.eur] = { cents: 1399, currency: 'eur' };

const FMT_USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

async function loadStats() {
  const allStories = await getAllStories();
  const totalStories = allStories.length;
  const livePublished = allStories.filter(
    (s) => s.videoSrc || s.videoKey,
  ).length;
  const comingSoon = allStories.filter((s) => s.isComingSoon).length;

  let usersCount = 0;
  let recentComments = 0;
  let mrrUsd = 0;
  let activeSubs = 0;

  if (SUPABASE_CONFIGURED) {
    try {
      const sb = createServiceClient();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      // Run the cheap counts and the FX fetch in parallel with the auth list.
      const [usersList, commentsRes, subsRes, fx] = await Promise.all([
        // Total registered users = everything in auth.users, not just
        // people who commented (which is what comment_user_meta tracks).
        sb.auth.admin.listUsers({ perPage: 500 }),
        sb
          .from('story_comments')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo),
        sb
          .from('subscriptions')
          .select('status, price_id, cancel_at_period_end'),
        getFxToUsd(),
      ]);
      usersCount = usersList.data?.users?.length ?? 0;
      recentComments = commentsRes.count ?? 0;

      let mrrCentsUsd = 0;
      for (const s of (subsRes.data ?? []) as Array<{
        status: string;
        price_id: string | null;
        cancel_at_period_end: boolean | null;
      }>) {
        if (s.status !== 'active') continue;
        activeSubs += 1;
        const meta = s.price_id ? PRICE_CENTS[s.price_id] : undefined;
        if (meta) mrrCentsUsd += meta.cents * fx[meta.currency];
      }
      mrrUsd = Math.round(mrrCentsUsd) / 100;
    } catch {
      // Schema not run yet — keep zeros.
    }
  }

  return {
    totalStories,
    livePublished,
    comingSoon,
    usersCount,
    recentComments,
    mrrUsd,
    activeSubs,
  };
}

async function loadRecentStories(limit = 5) {
  const all = await getAllStories();
  // Newest first — DB query orders ascending by created_at; we reverse so
  // the latest uploads sit at the top of the dashboard.
  return [...all].reverse().slice(0, limit);
}

async function loadCommentsToModerate(limit = 3) {
  if (!SUPABASE_CONFIGURED) return [];
  try {
    const sb = createServiceClient();
    const { data } = await sb
      .from('story_comments_with_counts')
      .select('id, story_slug, body, created_at, display_name, avatar_url')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function AdminDashboardPage() {
  const [stats, recentStories, recentComments] = await Promise.all([
    loadStats(),
    loadRecentStories(),
    loadCommentsToModerate(),
  ]);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <>
      <PageHead
        title="Dashboard"
        subtitle={`${today.charAt(0).toUpperCase() + today.slice(1)} · alluretv.net`}
        actions={
          <>
            <Button variant="glass" size="sm">
              <RefreshCw className="size-4" /> Atualizar
            </Button>
            <Button variant="rose" size="sm" asChild>
              <Link href="/admin/stories/new">
                <Plus className="size-4" /> Nova Story
              </Link>
            </Button>
          </>
        }
      />

      <StatGrid>
        <Stat
          label="Stories ao vivo"
          value={String(stats.livePublished)}
          delta={`${stats.comingSoon} coming soon`}
          deltaTone="neutral"
        />
        <Stat
          label="Usuários cadastrados"
          value={stats.usersCount.toLocaleString('pt-BR')}
          delta={SUPABASE_CONFIGURED ? 'em tempo real' : 'aguardando setup'}
          deltaTone={SUPABASE_CONFIGURED ? 'up' : 'neutral'}
        />
        <Stat
          label="MRR estimado"
          value={FMT_USD.format(stats.mrrUsd)}
          delta={
            SUPABASE_CONFIGURED
              ? stats.activeSubs > 0
                ? `${stats.activeSubs} ${stats.activeSubs === 1 ? 'assinatura ativa' : 'assinaturas ativas'}`
                : 'sem assinaturas ativas'
              : 'aguardando setup'
          }
          deltaTone={stats.mrrUsd > 0 ? 'up' : 'neutral'}
        />
        <Stat
          label="Comentários (7d)"
          value={stats.recentComments.toLocaleString('pt-BR')}
          delta={SUPABASE_CONFIGURED ? 'tempo real' : '—'}
          deltaTone="up"
        />
      </StatGrid>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-5">
        {/* Stories table */}
        <section>
          <SectionHead title="Stories recentes" link="Ver todas" href="/admin/stories" />
          <Table
            head={
              <>
                <Th>Título</Th>
                <Th className="hidden md:table-cell">Gênero</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </>
            }
          >
            {recentStories.map((s) => (
              <tr key={s.id} className="cursor-pointer">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="relative w-[64px] h-[36px] rounded-md shrink-0 overflow-hidden bg-bg-deep ring-1 ring-white/10">
                      <Image
                        src={s.cover}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="font-serif italic font-bold text-[13.5px] text-white truncate max-w-[280px]">
                        {s.title}
                      </p>
                      <p className="text-[11px] text-text-mute mt-0.5">
                        {s.totalMinutes ? `${s.totalMinutes} min · ` : ''}
                        {Object.keys(s.audioKeyByLocale ?? s.audioByLocale ?? {})
                          .length || 0}{' '}
                        idiomas
                        {s.hasEbook ? ' · ebook' : ''}
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
                <td className="px-4 py-3.5 text-right">
                  <Button variant="glass" size="sm" asChild>
                    <Link href={`/admin/stories/${s.slug}`}>Editar</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        </section>

        {/* Right column — quick actions + activity */}
        <div className="flex flex-col gap-5">
          <Card title="Atalhos rápidos">
            <div className="grid grid-cols-2 gap-2.5">
              <QuickAction icon={<Upload className="size-4" />} label="Subir vídeo" href="/admin/stories/new" />
              <QuickAction icon={<FileText className="size-4" />} label="Nova story" href="/admin/stories/new" />
              <QuickAction icon={<MessageSquare className="size-4" />} label="Moderar" href="/admin/comments" />
              <QuickAction icon={<CreditCard className="size-4" />} label="Stripe portal" href="/admin/subscriptions" />
            </div>
          </Card>

          <Card title="Comentários recentes">
            {recentComments.length === 0 ? (
              <p className="text-[12.5px] text-text-mute italic">
                {SUPABASE_CONFIGURED
                  ? 'Nada novo pra moderar.'
                  : 'Configure o Supabase pra ver atividade real.'}
              </p>
            ) : (
              <ul className="flex flex-col gap-3.5">
                {(recentComments as Array<{ id: string; story_slug: string; body: string; display_name: string | null; avatar_url: string | null }>).map((c) => (
                  <li key={c.id} className="flex gap-3 items-start">
                    <span
                      className="size-8 rounded-full bg-cover bg-center shrink-0 bg-gradient-to-br from-rose to-rose-deep grid place-items-center text-white text-[11px] font-bold"
                      style={
                        c.avatar_url
                          ? { backgroundImage: `url(${c.avatar_url})` }
                          : undefined
                      }
                    >
                      {!c.avatar_url &&
                        (c.display_name?.charAt(0)?.toUpperCase() ?? '?')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] leading-snug">
                        <b className="text-white">
                          {c.display_name ?? 'Anônimo'}
                        </b>{' '}
                        <span className="text-text-dim">
                          em <i>{c.story_slug}</i>
                        </span>
                      </p>
                      <p className="text-[12px] text-text-dim line-clamp-2 mt-1">
                        {c.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 pt-3 border-t border-white/[0.05]">
              <Link
                href="/admin/comments"
                className="text-[12.5px] text-rose-bright font-semibold hover:text-rose"
              >
                Ver todos →
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function QuickAction({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3.5 py-3 bg-bg-elevated border border-white/[0.06] rounded-xl text-[12.5px] font-semibold text-text-soft hover:border-rose hover:text-white transition-colors"
    >
      <span className="size-7 rounded-lg bg-rose/[0.13] text-rose-bright grid place-items-center shrink-0">
        {icon}
      </span>
      {label}
    </Link>
  );
}
