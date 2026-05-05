'use client';

// Native-app-style bottom tab bar. Fixed at the bottom (above iOS safe
// area), 4 items, big icons + labels — based on the JMIR/Bentley UX
// research on mobile design for older adults: 28px icons, 12px labels
// always visible, 56px+ tap targets.
//
// Hidden on the immersive routes (player, reader) so they keep the
// fullscreen feel.

import { Home, Library, Search, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useSearch } from './SearchProvider';

type Tab = {
  key: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  match?: (path: string) => boolean;
};

export function BottomTabBar() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { openSearch } = useSearch();

  // Hide on routes that need the entire screen (player, reader, studio
  // upload flows). Catches /s/foo/watch, /s/foo/read, etc.
  const immersiveRoute =
    /\/s\/[^/]+\/(watch|read)/.test(pathname) ||
    pathname.startsWith('/studio');
  if (immersiveRoute) return null;

  const tabs: Tab[] = [
    {
      key: 'home',
      href: '/',
      icon: Home,
      label: t('home'),
      match: (p) => p === '/' || p === '',
    },
    {
      key: 'library',
      href: '/account',
      icon: Library,
      label: t('myList'),
      match: (p) => p.startsWith('/account'),
    },
    {
      key: 'search',
      icon: Search,
      label: t('search'),
    },
    {
      key: 'profile',
      href: '/account',
      icon: User,
      label: t('account'),
      match: (p) => p.startsWith('/account'),
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Frosted/blurred floor so it sits cleanly over content */}
      <div className="absolute inset-0 bg-bg-deep/95 backdrop-blur-xl border-t border-border" />

      <ul className="relative grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match ? tab.match(pathname) : false;

          const inner = (
            <span
              className={cn(
                'group relative flex flex-col items-center justify-center gap-1 h-full px-1 select-none transition-colors active:bg-white/5',
                active ? 'text-rose-bright' : 'text-text-dim',
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-9 rounded-full bg-rose-bright"
                />
              )}
              <Icon
                className={cn(
                  'size-6',
                  active && 'fill-rose-bright/15 stroke-[2.4]',
                )}
              />
              <span
                className={cn(
                  'text-[11px] font-bold tracking-wide',
                  active && 'text-rose-bright',
                )}
              >
                {tab.label}
              </span>
            </span>
          );

          return (
            <li key={tab.key} className="contents">
              {tab.href ? (
                <Link
                  href={tab.href as never}
                  aria-label={tab.label}
                  aria-current={active ? 'page' : undefined}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  aria-label={tab.label}
                  onClick={openSearch}
                  className="contents"
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
