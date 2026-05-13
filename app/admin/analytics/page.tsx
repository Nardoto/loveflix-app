import Link from 'next/link';
import { TrendingUp, Users, CreditCard, DollarSign, MessageSquare, AlertCircle, ExternalLink } from 'lucide-react';
import {
  PageHead,
  Stat,
  StatGrid,
  Card,
  SectionHead,
  Table,
  Th,
  EmptyState,
} from '@/components/admin/AdminUI';
import { loadAnalytics, deltaPercent } from './queries';
import { SignupsChart } from './SignupsChart';

// Always fresh — admin dashboard, low traffic, real-time matters.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminAnalyticsPage() {
  const data = await loadAnalytics();

  const signupsDelta = deltaPercent(data.totals.signups7d, data.totals.signupsPrev7d);
  const subsDelta = deltaPercent(data.totals.subscribers7d, data.totals.subscribersPrev7d);
  const conversion =
    data.totals.users > 0
      ? Math.round((data.totals.activeSubscribers / data.totals.users) * 1000) / 10
      : 0;

  // Estimated churn: cancellations in 30d divided by active+canceled base.
  const churnBase = data.totals.activeSubscribers + data.totals.cancelled30d;
  const churnRate = churnBase > 0
    ? Math.round((data.totals.cancelled30d / churnBase) * 1000) / 10
    : 0;

  return (
    <>
      <PageHead
        title="Analytics"
        subtitle="Quem está entrando, quem está pagando, e como o catálogo está performando"
      />

      {!data.posthog.configured && <PostHogSetupBanner />}

      <StatGrid>
        <Stat
          label="Usuários cadastrados"
          value={data.totals.users.toLocaleString('pt-BR')}
          delta={signupsDelta.text}
          deltaTone={signupsDelta.tone}
        />
        <Stat
          label="Assinantes ativos"
          value={data.totals.activeSubscribers.toLocaleString('pt-BR')}
          delta={subsDelta.text}
          deltaTone={subsDelta.tone}
        />
        <Stat
          label="MRR (estimado)"
          value={`$${data.totals.mrrUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          delta={`${conversion}% conversão`}
          deltaTone={conversion > 0 ? 'up' : 'neutral'}
        />
        <Stat
          label="Churn 30d"
          value={`${churnRate}%`}
          delta={`${data.totals.cancelled30d} cancelados`}
          deltaTone={churnRate > 5 ? 'down' : 'neutral'}
        />
      </StatGrid>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-5 mb-8">
        <section>
          <SectionHead title="Novos signups — 30 dias" />
          <Card>
            <SignupsChart data={data.signupsDaily} />
            <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[12px] text-text-dim">
              <span>
                Últimos 7 dias:{' '}
                <b className="text-white">{data.totals.signups7d}</b>
              </span>
              <span>
                7 dias anteriores:{' '}
                <b className="text-white">{data.totals.signupsPrev7d}</b>
              </span>
              <span className={signupsDelta.tone === 'up' ? 'text-emerald-400' : signupsDelta.tone === 'down' ? 'text-red-400' : 'text-text-dim'}>
                {signupsDelta.text}
              </span>
            </div>
          </Card>
        </section>

        <div className="flex flex-col gap-5">
          <Card title="Assinantes por moeda">
            <ul className="flex flex-col gap-2.5">
              <CurrencyRow flag="🇺🇸" label="USD" count={data.byCurrency.usd} />
              <CurrencyRow flag="🇧🇷" label="BRL" count={data.byCurrency.brl} />
              <CurrencyRow flag="🇪🇺" label="EUR" count={data.byCurrency.eur} />
            </ul>
            <p className="mt-3 pt-3 border-t border-white/[0.05] text-[11px] text-text-mute">
              MRR estimado convertendo todos pra USD ao câmbio ~$15/mês por assinante.
            </p>
          </Card>

          <Card title="Atividade da comunidade">
            <ul className="flex flex-col gap-3.5 text-[12.5px]">
              <li className="flex items-center gap-3">
                <span className="size-8 rounded-lg bg-rose/[0.13] text-rose-bright grid place-items-center shrink-0">
                  <MessageSquare className="size-4" />
                </span>
                <div className="flex-1">
                  <p className="text-white font-semibold">{data.totals.comments7d}</p>
                  <p className="text-text-dim text-[11.5px]">comentários (7 dias)</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="size-8 rounded-lg bg-gold/[0.13] text-gold grid place-items-center shrink-0">
                  <TrendingUp className="size-4" />
                </span>
                <div className="flex-1">
                  <p className="text-white font-semibold">{data.totals.subscribers7d}</p>
                  <p className="text-text-dim text-[11.5px]">novos pagantes (7d)</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="size-8 rounded-lg bg-emerald-400/[0.13] text-emerald-300 grid place-items-center shrink-0">
                  <Users className="size-4" />
                </span>
                <div className="flex-1">
                  <p className="text-white font-semibold">{data.totals.signups7d}</p>
                  <p className="text-text-dim text-[11.5px]">novas contas (7d)</p>
                </div>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <section className="mb-8">
        <SectionHead title="Top stories por engajamento (30d)" link="Ver todas" href="/admin/stories" />
        {data.topStories.length === 0 ? (
          <EmptyState
            title="Sem dados ainda"
            desc="Quando assinantes começarem a comentar, as histórias mais comentadas aparecem aqui."
          />
        ) : (
          <Table
            head={
              <>
                <Th>Story</Th>
                <Th className="text-right">Comentários (30d)</Th>
                <Th className="hidden md:table-cell">Engajamento</Th>
              </>
            }
          >
            {data.topStories.map((s, i) => (
              <tr key={s.slug}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="text-text-mute text-[12px] font-mono w-5 text-right">
                      {i + 1}
                    </span>
                    <Link
                      href={`/admin/stories/${s.slug}`}
                      className="font-serif italic font-bold text-[13.5px] text-white hover:text-rose-bright"
                    >
                      {s.title}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-[13.5px] text-white">
                  {s.comments}
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <EngagementBar value={s.comments} max={data.topStories[0]?.comments ?? 1} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <DataSources configured={data.configured} posthogConfigured={data.posthog.configured} />
    </>
  );
}

function CurrencyRow({ flag, label, count }: { flag: string; label: string; count: number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-[13px] text-text-soft">
        <span aria-hidden>{flag}</span>
        <b className="text-white">{label}</b>
      </span>
      <span className="font-mono text-[13.5px] text-white">{count}</span>
    </li>
  );
}

function EngagementBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(2, (value / max) * 100);
  return (
    <div className="h-1.5 w-full max-w-[180px] bg-white/[0.05] rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-rose to-rose-bright"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PostHogSetupBanner() {
  return (
    <div className="mb-6 bg-amber-400/[0.06] border border-amber-400/[0.18] rounded-2xl p-4 flex items-start gap-3">
      <span className="size-8 rounded-lg bg-amber-400/[0.15] text-amber-300 grid place-items-center shrink-0">
        <AlertCircle className="size-4" />
      </span>
      <div className="flex-1 text-[13px]">
        <p className="text-amber-200 font-bold mb-1">
          PostHog não configurado
        </p>
        <p className="text-text-dim leading-relaxed mb-2">
          Os números abaixo (assinantes, signups, MRR) vêm do Supabase e já são reais. Pra ver{' '}
          <b>visitantes anônimos, países, páginas mais acessadas e funil de conversão</b>{' '}
          completo, plugue uma key do PostHog (free tier de 1M de eventos/mês).
        </p>
        <a
          href="https://app.posthog.com/signup"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-rose-bright font-semibold hover:text-rose"
        >
          Criar conta no PostHog <ExternalLink className="size-3" />
        </a>
        <span className="text-text-mute mx-2">·</span>
        <span className="text-text-dim text-[12px]">
          depois cole em{' '}
          <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-rose-bright font-mono text-[11px]">
            NEXT_PUBLIC_POSTHOG_KEY
          </code>
        </span>
      </div>
    </div>
  );
}

function DataSources({ configured, posthogConfigured }: { configured: boolean; posthogConfigured: boolean }) {
  return (
    <Card title="Fontes de dados">
      <ul className="grid sm:grid-cols-2 gap-3 text-[12.5px]">
        <DataSource
          icon={<Users className="size-3.5" />}
          name="Supabase — profiles"
          status={configured}
          desc="Signups, contas totais"
        />
        <DataSource
          icon={<CreditCard className="size-3.5" />}
          name="Supabase — subscriptions"
          status={configured}
          desc="MRR, ativos, churn"
        />
        <DataSource
          icon={<MessageSquare className="size-3.5" />}
          name="Supabase — story_comments"
          status={configured}
          desc="Engajamento por story"
        />
        <DataSource
          icon={<DollarSign className="size-3.5" />}
          name="Stripe webhook"
          status={configured}
          desc="Sync de assinaturas (live)"
        />
        <DataSource
          icon={<TrendingUp className="size-3.5" />}
          name="PostHog"
          status={posthogConfigured}
          desc="Visitantes, países, eventos"
        />
        <DataSource
          icon={<ExternalLink className="size-3.5" />}
          name="Vercel Analytics"
          status={false}
          desc="Não plugado (pageviews simples)"
        />
      </ul>
    </Card>
  );
}

function DataSource({
  icon,
  name,
  status,
  desc,
}: {
  icon: React.ReactNode;
  name: string;
  status: boolean;
  desc: string;
}) {
  return (
    <li className="flex items-center gap-3 p-3 bg-bg-elevated/40 border border-white/[0.04] rounded-xl">
      <span
        className={`size-7 rounded-lg grid place-items-center shrink-0 ${
          status
            ? 'bg-emerald-500/[0.15] text-emerald-300'
            : 'bg-white/[0.05] text-text-mute'
        }`}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold ${status ? 'text-white' : 'text-text-dim'}`}>
          {name}
        </p>
        <p className="text-[11px] text-text-mute">{desc}</p>
      </div>
      <span
        className={`text-[10px] font-extrabold uppercase tracking-wider ${
          status ? 'text-emerald-300' : 'text-text-mute'
        }`}
      >
        {status ? '✓ Ativo' : '○ Pendente'}
      </span>
    </li>
  );
}
