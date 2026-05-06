'use client';

// Slide-in mobile drawer for the small-screen nav. Sheet pattern with a
// blurred backdrop. Linked from the hamburger button in TopBar; we keep
// the open state lifted up there since the trigger lives in TopBar.

import { useEffect } from 'react';
import { X, Home, Heart, Diamond, User, Download } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/lib/navigation';
import { FlameIcon } from '@/components/icons/FlameIcon';
import { cn } from '@/lib/utils';
import { useInstall } from './InstallProvider';

const INSTALL_LABELS: Record<string, string> = {
  en: 'Install app',
  de: 'App installieren',
  fr: 'Installer l’app',
  es: 'Instalar app',
};

type NavItem = {
  href: string;
  icon: React.ReactNode;
  label: string;
  accent?: 'rose' | 'orange' | 'gold';
};

export function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const { canInstall, triggerInstall } = useInstall();

  // Lock body scroll while the drawer is open + close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const items: NavItem[] = [
    { href: '/', icon: <Home className="size-5" />, label: t('home') },
    {
      href: '/hot',
      icon: <FlameIcon flicker className="size-5" />,
      label: 'Hot',
      accent: 'orange',
    },
    {
      href: '/genres',
      icon: <Diamond className="size-5" />,
      label: t('genres'),
    },
    { href: '/account', icon: <Heart className="size-5" />, label: t('myList') },
    {
      href: '/account',
      icon: <User className="size-5" />,
      label: t('account'),
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Drawer */}
      <aside
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 w-[78vw] max-w-sm bg-bg-deep border-l border-border shadow-[0_0_60px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out lg:hidden flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-border shrink-0">
          <span className="font-serif text-xl font-black italic tracking-tight leading-none">
            <span className="brand-allure">Allure</span>
            <span className="brand-tv">TV</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid place-items-center size-10 -mr-2 rounded-full hover:bg-white/5 active:bg-white/10 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
          {items.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href as never}
              onClick={onClose}
              className={cn(
                'flex items-center gap-4 px-3 h-12 rounded-xl text-base font-medium transition-colors',
                'hover:bg-white/5 active:bg-white/10',
                item.accent === 'orange' && 'text-orange-300',
                item.accent === 'gold' && 'text-gold',
                !item.accent && 'text-text-soft',
              )}
            >
              <span
                className={cn(
                  'shrink-0',
                  item.accent === 'orange' && 'text-orange-400',
                  item.accent === 'gold' && 'text-gold-bright',
                  !item.accent && 'text-text-dim',
                )}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}

          {/* Install app — vanishes once running standalone (canInstall reads
              `display-mode: standalone` from the InstallProvider). On Android
              fires the native prompt; on iOS opens the 3-step sheet. */}
          {canInstall && (
            <>
              <div className="my-2 border-t border-white/5" />
              <button
                type="button"
                onClick={() => {
                  void triggerInstall();
                  onClose();
                }}
                className="flex items-center gap-4 px-3 h-12 rounded-xl text-base font-bold text-rose-bright bg-rose/5 hover:bg-rose/10 active:bg-rose/15 transition-colors text-left"
              >
                <span className="shrink-0 text-rose-bright">
                  <Download className="size-5" />
                </span>
                {INSTALL_LABELS[locale] ?? INSTALL_LABELS.en}
              </button>
            </>
          )}
        </nav>

        <div className="border-t border-border p-4 text-center text-[10px] uppercase tracking-[0.3em] text-text-mute shrink-0">
          alluretv.net
        </div>
      </aside>
    </>
  );
}
