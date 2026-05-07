import Link from 'next/link';
import { CreditCard, ExternalLink } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import {
  PageHead,
  Stat,
  StatGrid,
  Card,
  Pill,
  Table,
  Th,
} from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/button';
import { PRICE_IDS } from '@/lib/stripe';

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Cents per recurring period, indexed by Stripe price_id. We classify by
// the env-configured prices so the math survives if the dashboard creates
// new prices later — they'd just go into the "outros" bucket below.
const PRICE_CENTS: Record<string, { cents: number; currency: 'usd' | 'brl' | 'eur' }> = {};
if (PRICE_IDS.usd) PRICE_CENTS[PRICE_IDS.usd] = { cents: 1499, currency: 'usd' };
if (PRICE_IDS.brl) PRICE_CENTS[PRICE_IDS.brl] = { cents: 7990, currency: 'brl' };
if (PRICE_IDS.eur) PRICE_CENTS[PRICE_IDS.eur] = { cents: 1399, currency: 'eur' };

// Naive USD-equivalent FX so we can show one consolidated MRR figure.
// Replace with a daily-cached conversion table if accuracy matters.
const TO_USD: Record<string, number> = { usd: 1, brl: 0.2, eur: 1.08 };

type Sub = {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: string;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  updated_at: string | null;
  user_email?: string | null;
};

async function loadSubs(): Promise<{ subs: Sub[]; mrrUsd: number; active: number; trialing: number; cancelingAtPeriodEnd: number }> {
  if (!SUPABASE_CONFIGURED) {
    return { subs: [], mrrUsd: 0, active: 0, trialing: 0, cancelingAtPeriodEnd: 0 };
  }
  try {
    const sb = createServiceClient();
    const { data: subs } = await sb
      .from('subscriptions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200);
    if (!subs) {
      return { subs: [], mrrUsd: 0, active: 0, trialing: 0, cancelingAtPeriodEnd: 0 };
    }

    // Resolve emails for the user_ids in one shot. Auth admin API is
    // the simplest path; small-N enough that pagination isn't an issue.
    const userIds = subs.map((s) => s.user_id);
    const emailById = new Map<string, string>();
    try {
      const { data: usersList } = await sb.auth.admin.listUsers({ perPage: 200 });
      for (const u of usersList?.users ?? []) {
        if (userIds.includes(u.id) && u.email) emailById.set(u.id, u.email);
      }
    } catch {
      // Auth admin may be rate-limited; skip emails rather than fail.
    }

    let mrrCentsUsd = 0;
    let active = 0;
    let trialing = 0;
    let canceling = 0;
    for (const s of subs as Sub[]) {
      if (s.status === 'active') {
        active += 1;
        if (s.cancel_at_period_end) canceling += 1;
        const meta = s.price_id ? PRICE_CENTS[s.price_id] : undefined;
        if (meta) {
          mrrCentsUsd += meta.cents * (TO_USD[meta.currency] ?? 1);
        }
      } else if (s.status === 'trialing') {
        trialing += 1;
      }
    }

    return {
      subs: (subs as Sub[]).map((s) => ({ ...s, user_email: emailById.get(s.user_id) ?? null })),
      mrrUsd: Math.round(mrrCentsUsd) / 100,
      active,
      trialing,
      cancelingAtPeriodEnd: canceling,
    };
  } catch {
    return { subs: [], mrrUsd: 0, active: 0, trialing: 0, cancelingAtPeriodEnd: 0 };
  }
}

const STATUS_TONE: Record<string, 'published' | 'draft' | 'coming' | 'flagged' | 'active'> = {
  active: 'active',
  trialing: 'published',
  past_due: 'flagged',
  canceled: 'draft',
  unpaid: 'flagged',
  paused: 'draft',
  incomplete: 'draft',
  incomplete_expired: 'flagged',
};

export default async function AdminSubscriptionsPage() {
  const { subs, mrrUsd, active, trialing, cancelingAtPeriodEnd } = await loadSubs();

  return (
    <>
      <PageHead
        title="Assinaturas"
        subtitle={
          SUPABASE_CONFIGURED
            ? `${subs.length} no histórico (200 mais recentes)`
            : 'Configure o Supabase pra ver assinaturas reais'
        }
        actions={
          <Button variant="glass" size="sm" asChild>
            <a
              href="https://dashboard.stripe.com/subscriptions"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" /> Stripe Dashboard
            </a>
          </Button>
        }
      />

      <StatGrid>
        <Stat
          label="MRR (USD eq.)"
          value={`$${mrrUsd.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          delta={`${active} ativas`}
          deltaTone={active > 0 ? 'up' : 'neutral'}
        />
        <Stat
          label="Ativas"
          value={String(active)}
          delta={cancelingAtPeriodEnd > 0 ? `${cancelingAtPeriodEnd} cancelando` : 'todas firmes'}
          deltaTone={cancelingAtPeriodEnd > 0 ? 'down' : 'up'}
        />
        <Stat label="Em trial" value={String(trialing)} delta="período de teste" deltaTone="neutral" />
        <Stat
          label="Stripe"
          value={Object.keys(PRICE_CENTS).length === 3 ? '3/3' : `${Object.keys(PRICE_CENTS).length}/3`}
          delta="moedas configuradas"
          deltaTone={Object.keys(PRICE_CENTS).length === 3 ? 'up' : 'neutral'}
        />
      </StatGrid>

      {!SUPABASE_CONFIGURED && (
        <Card title="Setup pendente">
          <p className="text-[13px] text-text-dim mb-2">
            Pra ver assinaturas reais precisa configurar:
          </p>
          <ul className="text-[12.5px] text-text-soft space-y-1 list-disc pl-5">
            <li>
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> e{' '}
              <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> no Vercel
            </li>
            <li>
              Migration <code className="font-mono">0004_subscriptions.sql</code> rodada no SQL Editor do Supabase
            </li>
            <li>
              Webhook do Stripe apontando pra{' '}
              <code className="font-mono">https://alluretv.net/api/stripe/webhook</code>
            </li>
            <li>
              <code className="font-mono">STRIPE_SECRET_KEY</code> +{' '}
              <code className="font-mono">STRIPE_WEBHOOK_SECRET</code> +{' '}
              <code className="font-mono">STRIPE_PRICE_ID_MONTHLY</code> /{' '}
              <code className="font-mono">_BRL</code> /{' '}
              <code className="font-mono">_EUR</code>
            </li>
          </ul>
        </Card>
      )}

      {subs.length > 0 ? (
        <Table
          head={
            <>
              <Th>Usuário</Th>
              <Th>Status</Th>
              <Th className="hidden md:table-cell">Moeda</Th>
              <Th className="hidden lg:table-cell">Próx. cobrança</Th>
              <Th className="hidden lg:table-cell">Atualizado</Th>
              <Th className="text-right">Stripe</Th>
            </>
          }
        >
          {subs.map((s) => {
            const meta = s.price_id ? PRICE_CENTS[s.price_id] : undefined;
            const periodEnd = s.current_period_end
              ? new Date(s.current_period_end).toLocaleDateString('pt-BR')
              : '—';
            const updated = s.updated_at
              ? new Date(s.updated_at).toLocaleDateString('pt-BR')
              : '—';
            return (
              <tr key={s.user_id}>
                <td className="px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[13.5px] text-white truncate max-w-[280px]">
                      {s.user_email ?? s.user_id}
                    </p>
                    <p className="text-[11px] text-text-mute font-mono truncate max-w-[280px]">
                      {s.stripe_customer_id}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <Pill tone={STATUS_TONE[s.status] ?? 'draft'}>{s.status}</Pill>
                  {s.cancel_at_period_end && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300 font-bold">
                      cancelando
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-[12.5px] text-text-dim hidden md:table-cell uppercase">
                  {meta?.currency ?? '—'}
                </td>
                <td className="px-4 py-3.5 text-[12.5px] text-text-dim hidden lg:table-cell">
                  {periodEnd}
                </td>
                <td className="px-4 py-3.5 text-[12.5px] text-text-dim hidden lg:table-cell">
                  {updated}
                </td>
                <td className="px-4 py-3.5 text-right">
                  {s.stripe_subscription_id && (
                    <a
                      href={`https://dashboard.stripe.com/subscriptions/${s.stripe_subscription_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] text-rose-bright hover:text-rose font-semibold"
                    >
                      Abrir <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      ) : (
        SUPABASE_CONFIGURED && (
          <Card title="Sem assinaturas ainda">
            <div className="flex items-center gap-3">
              <span className="size-10 rounded-xl bg-rose/15 grid place-items-center text-rose-bright">
                <CreditCard className="size-5" />
              </span>
              <div className="flex-1">
                <p className="text-[13.5px] text-white font-bold">
                  Aguardando o primeiro checkout
                </p>
                <p className="text-[12px] text-text-dim mt-0.5">
                  Quando alguém assinar via Stripe, a linha aparece aqui automaticamente
                  pelo webhook.
                </p>
              </div>
              <Button variant="glass" size="sm" asChild>
                <Link href="/">Ver landing</Link>
              </Button>
            </div>
          </Card>
        )
      )}
    </>
  );
}
