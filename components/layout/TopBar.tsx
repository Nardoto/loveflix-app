'use client';

import { Search, User, Menu, LogIn, LogOut } from 'lucide-react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, usePathname, useRouter } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { FlameIcon } from '@/components/icons/FlameIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MobileNav } from './MobileNav';
import { useSearch } from './SearchProvider';
import { InstallAppMenuItem } from './InstallAppMenuItem';
import { signOut } from '@/app/actions/auth';

export type TopBarUser = {
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
} | null;

const LANG_FLAGS: Record<string, { flag: string; name: string }> = {
  en: { flag: '🇺🇸', name: 'English' },
  de: { flag: '🇩🇪', name: 'Deutsch' },
  fr: { flag: '🇫🇷', name: 'Français' },
  es: { flag: '🇪🇸', name: 'Español' },
};

export function TopBar({ user }: { user?: TopBarUser } = {}) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { openSearch } = useSearch();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close drawer when route changes (avoids it sticking open after a
  // Link navigates).
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as 'en' | 'de' | 'fr' | 'es' });
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          scrolled
            ? // Fully opaque once the user scrolls — story-page titles and
              // catalog covers were bleeding through the 90% bg before.
              'bg-bg-deep shadow-lg shadow-black/40 border-b border-white/5'
            : // At the very top, the gradient lets the hero image breathe
              // behind the bar (Netflix/Disney+ pattern).
              'bg-gradient-to-b from-bg-deep via-bg-deep/70 to-transparent'
        }`}
      >
        <div className="flex h-16 md:h-18 items-center gap-2 md:gap-4 px-3 md:px-10">
          <Link
            href="/"
            aria-label="AllureTV — home"
            className="group flex flex-col leading-none shrink-0"
          >
            <span className="font-serif text-lg md:text-2xl font-black italic tracking-tight">
              <span className="brand-allure">Allure</span>
              <span className="brand-tv">TV</span>
            </span>
            <span className="brand-rule mt-0.5" />
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm text-text-soft ml-4">
            <Link
              href="/"
              className="hover:text-rose-bright transition-colors font-medium"
            >
              {t('home')}
            </Link>
            <Link
              href="/hot"
              className="inline-flex items-center gap-1.5 font-bold tracking-wide text-orange-300 hover:text-orange-200 transition-colors"
            >
              <FlameIcon flicker className="size-4" />
              HOT
            </Link>
            <Link
              href="/account"
              className="hover:text-rose-bright transition-colors font-medium"
            >
              {t('myList')}
            </Link>
            <Link
              href="/genres"
              className="hover:text-rose-bright transition-colors font-medium"
            >
              {t('genres')}
            </Link>
            <Link
              href="/studio"
              className="hover:text-rose-bright transition-colors font-medium text-gold"
            >
              {t('studio')}
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('search')}
              onClick={openSearch}
            >
              <Search />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 sm:px-3 gap-1.5 text-sm"
                >
                  <span className="text-base leading-none">
                    {LANG_FLAGS[locale]?.flag}
                  </span>
                  <span className="hidden sm:inline uppercase font-bold tracking-wider text-xs">
                    {locale}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Language</DropdownMenuLabel>
                {Object.entries(LANG_FLAGS).map(([code, { flag, name }]) => (
                  <DropdownMenuItem
                    key={code}
                    onClick={() => switchLocale(code)}
                    className={code === locale ? 'text-rose-bright' : ''}
                  >
                    <span className="text-base">{flag}</span>
                    <span>{name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label={user ? `Account — ${user.displayName}` : 'Sign in'}
                  className="size-9 sm:size-10 rounded-full bg-gradient-to-br from-rose to-rose-deep flex items-center justify-center text-white shadow-lg shadow-rose/30 hover:scale-105 transition-transform overflow-hidden ring-2 ring-rose-bright/20"
                >
                  {user?.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.displayName}
                      width={40}
                      height={40}
                      className="size-full object-cover"
                      unoptimized
                    />
                  ) : user ? (
                    <span className="text-sm font-bold">
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User className="size-5" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px]">
                {user ? (
                  <>
                    <DropdownMenuLabel>
                      <p className="font-bold text-white truncate">
                        {user.displayName}
                      </p>
                      {user.email && (
                        <p className="text-xs text-text-dim font-normal truncate mt-0.5">
                          {user.email}
                        </p>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account">{t('account')}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/studio">{t('studio')}</Link>
                    </DropdownMenuItem>
                    <InstallAppMenuItem />
                    <DropdownMenuSeparator />
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-white/5 inline-flex items-center gap-2 text-rose hover:text-rose-bright transition-colors"
                      >
                        <LogOut className="size-4" /> Sign out
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <DropdownMenuLabel>Welcome</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href="/login" className="inline-flex items-center gap-2">
                        <LogIn className="size-4" /> {t('signIn')}
                      </Link>
                    </DropdownMenuItem>
                    <InstallAppMenuItem />
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu />
            </Button>
          </div>
        </div>
      </header>

      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
