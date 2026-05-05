'use client';

// Soft "Add to Home Screen" banner. Two flavors in one component:
//
<<<<<<< HEAD
//   • Android Chrome: listens for `beforeinstallprompt`, captures the
//     event, and exposes a single Install button that fires the native
//     install dialog. Triggers the standalone PWA mode (no browser bar).
//
//   • iOS Safari: Apple does not implement `beforeinstallprompt`, so we
//     show a textual instruction ("Share → Add to Home Screen") instead.
//
// Gates per the older-adult UX research:
//   • Hidden on first visit (no cold-start pop-up).
//   • Hidden if already in standalone mode.
//   • Hidden if user dismissed (X button) — sticky via localStorage.
//   • Visible only after 60s on Android, 30s on iOS, on visit ≥ 2.
//   • Hidden on lg screens (this is a phone-only feature).
=======
//   - Android Chrome: listens for `beforeinstallprompt`, captures the
//     event, and exposes a single Install button that fires the native
//     install dialog. Triggers the standalone PWA mode (no browser bar).
//
//   - iOS Safari: Apple does not implement `beforeinstallprompt`, so we
//     show a textual instruction (Share -> Add to Home Screen) instead.
//
// Gates per the older-adult UX research:
//   - Hidden on first visit (no cold-start pop-up).
//   - Hidden if already in standalone mode.
//   - Hidden if user dismissed (X button) - sticky via localStorage.
//   - Visible only after 60s on Android, 30s on iOS, on visit >= 2.
//   - Hidden on lg screens (this is a phone-only feature).
>>>>>>> feat/55plus-redesign-pwa

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Share, X } from 'lucide-react';
import { useLocale } from 'next-intl';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const VISITS_KEY = 'alluretv-visits';
const DISMISSED_KEY = 'alluretv-install-dismissed';
const ANDROID_DELAY_MS = 60_000;
const IOS_DELAY_MS = 30_000;

const COPY: Record<
  string,
  {
    title: string;
    desc: string;
    install: string;
    dismiss: string;
    iosShare: string;
    iosAdd: string;
  }
> = {
  en: {
    title: 'Install AllureTV',
<<<<<<< HEAD
    desc: 'Add to your home screen — opens fast, full screen, no browser bar.',
=======
    desc: 'Add to your home screen - opens fast, full screen, no browser bar.',
>>>>>>> feat/55plus-redesign-pwa
    install: 'Install',
    dismiss: 'Dismiss',
    iosShare: 'Share',
    iosAdd: 'Add to Home Screen',
  },
  de: {
    title: 'AllureTV installieren',
<<<<<<< HEAD
    desc: 'Zum Startbildschirm hinzufügen — schneller, Vollbild, ohne Browserleiste.',
    install: 'Installieren',
    dismiss: 'Schließen',
=======
    desc: 'Zum Startbildschirm hinzufuegen - schneller, Vollbild, ohne Browserleiste.',
    install: 'Installieren',
    dismiss: 'Schliessen',
>>>>>>> feat/55plus-redesign-pwa
    iosShare: 'Teilen',
    iosAdd: 'Zum Home-Bildschirm',
  },
  fr: {
    title: 'Installer AllureTV',
<<<<<<< HEAD
    desc: 'Ajouter à l’écran d’accueil — rapide, plein écran, sans barre.',
    install: 'Installer',
    dismiss: 'Fermer',
    iosShare: 'Partager',
    iosAdd: 'Sur l’écran d’accueil',
  },
  es: {
    title: 'Instalar AllureTV',
    desc: 'Añade a la pantalla de inicio — rápido, pantalla completa, sin barra.',
    install: 'Instalar',
    dismiss: 'Cerrar',
    iosShare: 'Compartir',
    iosAdd: 'Añadir a Inicio',
=======
    desc: "Ajouter a l'ecran d'accueil - rapide, plein ecran, sans barre.",
    install: 'Installer',
    dismiss: 'Fermer',
    iosShare: 'Partager',
    iosAdd: "Sur l'ecran d'accueil",
  },
  es: {
    title: 'Instalar AllureTV',
    desc: 'Anade a la pantalla de inicio - rapido, pantalla completa, sin barra.',
    install: 'Instalar',
    dismiss: 'Cerrar',
    iosShare: 'Compartir',
    iosAdd: 'Anadir a Inicio',
>>>>>>> feat/55plus-redesign-pwa
  },
};

export function InstallBanner() {
  const locale = useLocale();
  const [show, setShow] = useState(false);
  const [installEvent, setInstallEvent] = useState<BIPEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
<<<<<<< HEAD
    // Already running as a standalone PWA? No banner needed.
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // iOS legacy "standalone" flag.
    if ((window.navigator as { standalone?: boolean }).standalone) return;
    // User said no in a previous session.
    if (localStorage.getItem(DISMISSED_KEY) === '1') return;

    // Visit-counter gating (research: never on first visit).
=======
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((window.navigator as { standalone?: boolean }).standalone) return;
    if (localStorage.getItem(DISMISSED_KEY) === '1') return;

>>>>>>> feat/55plus-redesign-pwa
    const visits = parseInt(localStorage.getItem(VISITS_KEY) || '0', 10) + 1;
    localStorage.setItem(VISITS_KEY, String(visits));
    if (visits < 2) return;

<<<<<<< HEAD
    // iOS detection — covers iPhone/iPod + iPad-on-iOS-13+ which reports as
    // MacIntel with touch points.
=======
>>>>>>> feat/55plus-redesign-pwa
    const ua = navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    if (ios) {
<<<<<<< HEAD
      // No `beforeinstallprompt` on iOS — just delay-then-show.
=======
>>>>>>> feat/55plus-redesign-pwa
      const t = setTimeout(() => setShow(true), IOS_DELAY_MS);
      return () => clearTimeout(t);
    }

<<<<<<< HEAD
    // Android Chrome path. Capture the prompt event, hold it, then show
    // the banner once the activity timer fires.
=======
>>>>>>> feat/55plus-redesign-pwa
    let captured: BIPEvent | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      captured = e as BIPEvent;
      if (!timer) {
        timer = setTimeout(() => {
          setInstallEvent(captured);
          setShow(true);
        }, ANDROID_DELAY_MS);
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const onDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShow(false);
  };

  const onInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setShow(false);
    setInstallEvent(null);
  };

  if (!show) return null;
  const t = COPY[locale] ?? COPY.en;

  return (
    <div
      className="fixed inset-x-0 bottom-16 z-[55] px-3 lg:hidden"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)',
      }}
      role="dialog"
      aria-label={t.title}
    >
      <div className="mx-auto max-w-md rounded-2xl bg-bg-card/95 backdrop-blur-xl border border-rose-bright/25 shadow-2xl shadow-black/70 p-3.5 flex items-center gap-3">
        <Image
          src="/logo/mark.jpg"
          alt=""
          width={52}
          height={52}
          className="rounded-xl shrink-0 ring-1 ring-white/10"
          unoptimized
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] text-white leading-tight">
            {t.title}
          </p>
          {isIOS ? (
            <p className="text-xs text-text-dim mt-1 leading-snug flex items-center gap-1 flex-wrap">
              <Share className="inline-block size-3.5 text-rose-bright shrink-0" />
              <span>
<<<<<<< HEAD
                {t.iosShare} → <span className="text-text-soft">{t.iosAdd}</span>
=======
                {t.iosShare} {'->'} <span className="text-text-soft">{t.iosAdd}</span>
>>>>>>> feat/55plus-redesign-pwa
              </span>
            </p>
          ) : (
            <p className="text-xs text-text-dim mt-1 leading-snug line-clamp-2">
              {t.desc}
            </p>
          )}
        </div>
        {!isIOS && installEvent && (
          <button
            onClick={onInstall}
            className="shrink-0 px-4 h-10 rounded-full bg-gradient-to-r from-rose to-rose-deep text-white font-bold text-sm shadow shadow-rose/30 active:scale-95 transition-transform"
          >
            {t.install}
          </button>
        )}
        <button
          onClick={onDismiss}
          aria-label={t.dismiss}
          className="shrink-0 grid place-items-center size-9 rounded-full hover:bg-white/5 active:bg-white/10 text-text-dim"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
