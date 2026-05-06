import Link from 'next/link';
import { Plus, RefreshCw, Upload, FileText, MessageSquare, CreditCard } from 'lucide-react';
import { allStories } from '@/lib/data/stories';
import { createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
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

async function loadStats() {
  const totalStories = allStories.length;
  const livePublished = allStories.filter(
    (s) => s.videoSrc || s.videoKey,
  ).length;
  const comingSoon = allStories.filter((s) => s.isComingSoon).length;

  let usersCount = 0;
  let recentComments = 0;

  if (SUPABASE_CONFIGURED) {
    try {
      const sb = createServiceClient();
      const [{ count: u }, { count: c }] = await Promise.all([
        sb.from('comment_user_meta').select('*', { count: 'exact', head: true }),
        sb
          .from('story_comments')
          .select('*', { count: 'exact', head: true })
          .gte(
            'created_at',
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          ),
      ]);
      usersCount = u ?? 0;
      recentComments = c ?? 0;
    } catch {
      // Schema not run yet — keep zeros.
    }
  }

  return { totalStories, livePublished, comingSoon, usersCount, recentComments };
}

async function loadRecentStories(limit = 5) {
  return allStories.slice(0, limit);
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
          value="$0"
          delta="Stripe pendente"
          deltaTone="neutral"
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
                    <span className="size-11 w-[44px] h-[28px] rounded-md shrink-0 bg-gradient-to-br from-burgundy to-bg-deep" />
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
