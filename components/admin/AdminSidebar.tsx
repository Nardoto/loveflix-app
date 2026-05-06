'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Film,
  MessageSquare,
  Users,
  CreditCard,
  BarChart3,
  ShieldCheck,
  Settings,
  Code2,
  LogOut,
} from 'lucide-react';
import { signOut } from '@/app/actions/auth';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
};

const NAV_OPS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutGrid },
  { href: '/admin/stories', label: 'Stories', icon: Film },
  { href: '/admin/comments', label: 'Comentários', icon: MessageSquare },
  { href: '/admin/users', label: 'Usuários', icon: Users },
  { href: '/admin/subscriptions', label: 'Assinaturas', icon: CreditCard },
];

const NAV_INSIGHTS: NavItem[] = [
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/audit', label: 'Auditoria', icon: ShieldCheck },
];

const NAV_SYSTEM: NavItem[] = [
  { href: '/admin/settings', label: 'Configurações', icon: Settings },
  { href: '/admin/logs', label: 'Logs', icon: Code2 },
];

export function AdminSidebar({
  user,
}: {
  user: {
    email: string | null;
    displayName: string;
    avatarUrl: string | null;
  };
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside className="hidden md:flex w-60 shrink-0 sticky top-0 h-screen flex-col border-r border-white/[0.06] bg-[#110a14] overflow-y-auto">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/[0.06] flex items-center gap-2.5">
        <span className="size-8 rounded-lg bg-gradient-to-br from-rose to-rose-deep grid place-items-center font-serif italic font-black text-white text-base">
          A
        </span>
        <div className="leading-none">
          <span className="font-serif italic font-black text-[18px] tracking-tight">
            <span className="brand-allure">Allure</span>
            <span className="brand-tv">TV</span>
          </span>
          <span className="block font-bold text-[9px] tracking-[0.2em] uppercase text-gold mt-0.5">
            Admin
          </span>
        </div>
      </div>

      {/* Nav sections */}
      <NavSection title="Operações" items={NAV_OPS} isActive={isActive} />
      <NavSection title="Insights" items={NAV_INSIGHTS} isActive={isActive} />
      <NavSection title="Sistema" items={NAV_SYSTEM} isActive={isActive} />

      {/* User footer */}
      <div className="mt-auto p-3 border-t border-white/[0.06] flex items-center gap-2.5">
        {user.avatarUrl ? (
          <span className="relative size-8 rounded-full overflow-hidden bg-bg-deep shrink-0 ring-1 ring-white/10">
            <Image
              src={user.avatarUrl}
              alt={user.displayName}
              fill
              sizes="32px"
              className="object-cover"
              unoptimized
            />
          </span>
        ) : (
          <span className="size-8 rounded-full bg-gradient-to-br from-rose to-rose-deep grid place-items-center text-white text-xs font-bold shrink-0">
            {user.displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate">
            {user.displayName}
          </p>
          {user.email && (
            <p className="text-[10.5px] text-text-dim truncate">{user.email}</p>
          )}
        </div>
        <form action={signOut}>
          <button
            type="submit"
            title="Sair"
            className="grid place-items-center size-7 rounded-lg border border-white/[0.06] text-text-dim hover:text-rose hover:border-rose transition-colors"
          >
            <LogOut className="size-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
}

function NavSection({
  title,
  items,
  isActive,
}: {
  title: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
}) {
  return (
    <div className="px-3 py-3 border-b border-white/[0.06] last:border-b-0">
      <h6 className="ml-2 mb-1.5 text-[9px] font-extrabold tracking-[0.2em] uppercase text-text-mute">
        {title}
      </h6>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] transition-colors',
              active
                ? 'bg-gradient-to-r from-rose/[0.16] to-rose/[0.04] text-rose-bright'
                : 'text-text-soft hover:bg-white/[0.04]',
            )}
          >
            <Icon className="size-4 shrink-0 opacity-85" />
            <span>{item.label}</span>
            {item.badge != null && (
              <span className="ml-auto bg-rose text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
