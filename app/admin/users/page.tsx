import Image from 'next/image';
import { createServiceClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth-helpers';
import { PageHead, Pill, Stat, StatGrid, Table, Th } from '@/components/admin/AdminUI';
import { UserDeleteButton } from '@/components/admin/UserDeleteButton';

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAILS_SET = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

type SubRow = {
  user_id: string;
  status: string;
  cancel_at_period_end: boolean | null;
};

type UserDisplay = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  provider: string;
  createdAt: string;
  lastSignIn: string | null;
  subscription: SubRow | null;
};

async function loadUsers(): Promise<{
  users: UserDisplay[];
  totals: { total: number; admins: number; paying: number; trialing: number };
}> {
  if (!SUPABASE_CONFIGURED) {
    return { users: [], totals: { total: 0, admins: 0, paying: 0, trialing: 0 } };
  }

  const sb = createServiceClient();
  // Pull up to 500 users (Supabase's listUsers caps at 1000 per page).
  // For larger projects we'd paginate; not relevant at AllureTV's scale yet.
  const { data: usersData } = await sb.auth.admin.listUsers({ perPage: 500 });
  const rawUsers = usersData?.users ?? [];

  // Map subscriptions in one shot so the join is cheap.
  let subsByUser = new Map<string, SubRow>();
  try {
    const { data: subs } = await sb
      .from('subscriptions')
      .select('user_id, status, cancel_at_period_end');
    for (const s of (subs ?? []) as SubRow[]) {
      subsByUser.set(s.user_id, s);
    }
  } catch {
    // subscriptions table may not exist on a fresh setup — skip silently.
    subsByUser = new Map();
  }

  const users: UserDisplay[] = rawUsers.map((u) => {
    const meta = (u.user_metadata ?? {}) as {
      full_name?: string;
      name?: string;
      avatar_url?: string;
      picture?: string;
    };
    const appMeta = (u.app_metadata ?? {}) as {
      provider?: string;
      providers?: string[];
    };
    const email = u.email ?? '';
    const displayName =
      meta.full_name ||
      meta.name ||
      (email ? email.split('@')[0] : 'sem-nome');
    const avatarUrl = meta.avatar_url || meta.picture || null;
    const provider = appMeta.provider || appMeta.providers?.[0] || 'email';
    return {
      id: u.id,
      email,
      name: displayName,
      avatarUrl,
      provider,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      subscription: subsByUser.get(u.id) ?? null,
    };
  });

  // Sort by created_at desc — newest accounts first.
  users.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

  const totals = {
    total: users.length,
    admins: users.filter((u) => ADMIN_EMAILS_SET.has(u.email.toLowerCase()))
      .length,
    paying: users.filter(
      (u) => u.subscription?.status === 'active' && !u.subscription.cancel_at_period_end,
    ).length,
    trialing: users.filter((u) => u.subscription?.status === 'trialing').length,
  };

  return { users, totals };
}

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  email: 'Email link',
  github: 'GitHub',
  apple: 'Apple',
};

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}m atrás`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h atrás`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d atrás`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default async function AdminUsersPage() {
  const [{ users, totals }, me] = await Promise.all([loadUsers(), getUser()]);
  const myId = me?.id ?? null;

  return (
    <>
      <PageHead
        title="Usuários"
        subtitle={
          SUPABASE_CONFIGURED
            ? `${totals.total} cadastrados · ${totals.admins} admin · ${totals.paying} pagantes`
            : 'Configure o Supabase pra ver os usuários'
        }
      />

      <StatGrid>
        <Stat label="Total" value={String(totals.total)} delta="cadastros" deltaTone="neutral" />
        <Stat
          label="Pagantes"
          value={String(totals.paying)}
          delta={totals.paying > 0 ? 'ativos' : 'nenhum ainda'}
          deltaTone={totals.paying > 0 ? 'up' : 'neutral'}
        />
        <Stat
          label="Em trial"
          value={String(totals.trialing)}
          delta="período de teste"
          deltaTone="neutral"
        />
        <Stat
          label="Admins"
          value={String(totals.admins)}
          delta="ADMIN_EMAILS"
          deltaTone="neutral"
        />
      </StatGrid>

      {users.length === 0 ? (
        <p className="text-[13px] text-text-dim italic">
          {SUPABASE_CONFIGURED
            ? 'Nenhum usuário cadastrado ainda.'
            : 'Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY pra ver os usuários reais.'}
        </p>
      ) : (
        <Table
          head={
            <>
              <Th>Usuário</Th>
              <Th className="hidden md:table-cell">Plano</Th>
              <Th className="hidden lg:table-cell">Provedor</Th>
              <Th className="hidden lg:table-cell">Cadastro</Th>
              <Th>Última atividade</Th>
              <Th className="text-right">Ações</Th>
            </>
          }
        >
          {users.map((u) => {
            const isAdmin = ADMIN_EMAILS_SET.has(u.email.toLowerCase());
            return (
              <tr key={u.id}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="relative size-9 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-rose to-rose-deep ring-1 ring-white/10">
                      {u.avatarUrl ? (
                        <Image
                          src={u.avatarUrl}
                          alt=""
                          fill
                          sizes="36px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="absolute inset-0 grid place-items-center text-white text-xs font-bold">
                          {(u.name.charAt(0) || '?').toUpperCase()}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13.5px] font-semibold text-white truncate max-w-[280px]">
                          {u.name}
                        </p>
                        {isAdmin && (
                          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold-bright">
                            admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-mute truncate max-w-[280px] font-mono">
                        {u.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <PlanPill sub={u.subscription} />
                </td>
                <td className="px-4 py-3.5 text-[12.5px] text-text-dim hidden lg:table-cell">
                  {PROVIDER_LABEL[u.provider] ?? u.provider}
                </td>
                <td className="px-4 py-3.5 text-[12.5px] text-text-dim hidden lg:table-cell">
                  {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3.5 text-[12.5px] text-text-dim">
                  {formatRelative(u.lastSignIn)}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <UserDeleteButton
                    userId={u.id}
                    userLabel={u.name || u.email}
                    disabled={isAdmin || u.id === myId}
                    disabledReason={
                      u.id === myId
                        ? 'Não dá pra apagar sua própria conta.'
                        : isAdmin
                          ? 'Tira o email do ADMIN_EMAILS pra poder apagar.'
                          : undefined
                    }
                  />
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}

function PlanPill({ sub }: { sub: SubRow | null }) {
  if (!sub) return <span className="text-[11px] text-text-mute">—</span>;
  if (sub.status === 'active') {
    return (
      <Pill tone="active">
        {sub.cancel_at_period_end ? 'Cancelando' : 'Pagante'}
      </Pill>
    );
  }
  if (sub.status === 'trialing') return <Pill tone="published">Trial</Pill>;
  if (sub.status === 'canceled') return <Pill tone="draft">Cancelada</Pill>;
  return <Pill tone="flagged">{sub.status}</Pill>;
}
