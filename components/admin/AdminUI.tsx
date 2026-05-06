// Shared primitives for the /admin pages (Dashboard, Stories, Comments, etc).
// Match the look from apresentacao-app/admin-mockup.html.

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="font-serif italic font-black text-3xl md:text-[32px] text-white tracking-tight leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-text-dim text-sm mt-1.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  delta,
  deltaTone = 'up',
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-text-mute mb-2">
        {label}
      </p>
      <p className="font-serif italic font-black text-[30px] text-white leading-none">
        {value}
      </p>
      {delta && (
        <p
          className={cn(
            'mt-2 text-[11.5px] font-semibold inline-flex items-center gap-1',
            deltaTone === 'up' && 'text-emerald-400',
            deltaTone === 'down' && 'text-red-400',
            deltaTone === 'neutral' && 'text-text-dim',
          )}
        >
          {delta}
        </p>
      )}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">{children}</div>
  );
}

export function Card({
  title,
  children,
  action,
  className,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-bg-card border border-white/[0.06] rounded-2xl p-5',
        className,
      )}
    >
      {title && (
        <header className="flex items-center justify-between mb-3">
          <h3 className="text-[13.5px] font-bold text-white">{title}</h3>
          {action}
        </header>
      )}
      {children}
    </div>
  );
}

export function SectionHead({
  title,
  link,
  href,
}: {
  title: string;
  link?: string;
  href?: string;
}) {
  return (
    <div className="flex items-baseline justify-between mb-3.5">
      <h2 className="font-serif italic font-black text-[22px] text-white">
        {title}
      </h2>
      {link && href && (
        <a
          href={href}
          className="text-[12.5px] text-rose-bright font-semibold hover:text-rose"
        >
          {link} →
        </a>
      )}
    </div>
  );
}

export function Pill({
  tone,
  children,
}: {
  tone: 'published' | 'draft' | 'coming' | 'flagged' | 'active' | 'free';
  children: ReactNode;
}) {
  const map: Record<string, string> = {
    published: 'bg-emerald-500/[0.13] text-emerald-300',
    draft: 'bg-amber-400/[0.13] text-amber-300',
    coming: 'bg-gold/[0.13] text-gold',
    flagged: 'bg-red-400/[0.13] text-red-300',
    active: 'bg-rose/[0.13] text-rose-bright',
    free: 'bg-amber-400/[0.10] text-amber-200/80',
  };
  return (
    <span
      className={cn(
        'inline-block px-2.5 py-[3px] rounded-full text-[10.5px] font-bold tracking-wide',
        map[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Table({
  head,
  children,
}: {
  head: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden">
      <table className="w-full text-[13.5px]">
        <thead className="bg-white/[0.025]">
          <tr className="text-left">{head}</tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-white/[0.06] [&>tr:hover]:bg-white/[0.02]">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-mute',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function EmptyState({
  title,
  desc,
}: {
  title: string;
  desc?: string;
}) {
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-12 text-center">
      <p className="font-serif italic text-xl text-white mb-1">{title}</p>
      {desc && <p className="text-sm text-text-dim">{desc}</p>}
    </div>
  );
}
