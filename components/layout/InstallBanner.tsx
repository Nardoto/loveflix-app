'use client';

// Auto-shown install banner. Appears immediately on first visit when the
// device is installable (Chromium captured `beforeinstallprompt`, or the
// browser is iOS Safari). Sits above the bottom tab bar on phones, hidden
// on lg+ since the install button in the account dropdown covers desktop.
//
// Both this banner and the always-available "Install app" account-menu
// item read from the InstallProvider, so dismissing here also hides the
// menu trigger from re-prompting on its own.

import Image from 'next/image';
import { Share, X, Plus, Check, ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useInstall } from './InstallProvider';

const COPY: Record<
  string,
  {
    title: string;
    desc: string;
    install: string;
    dismiss: string;
    iosCta: string;
    iosTitle: string;
    iosStep1: string;
    iosStep2: string;
    iosStep3: string;
    iosClose: string;
  }
> = {
  en: {
    title: 'Install AllureTV',
    desc: 'Add to your home screen — opens fast, full screen, no browser bar.',
    install: 'Install',
    dismiss: 'Dismiss',
    iosCta: 'Tap to see how →',
    iosTitle: 'Add AllureTV to Home Screen',
    iosStep1: 'Tap the Share button at the bottom of Safari.',
    iosStep2: 'Scroll down and tap "Add to Home Screen".',
    iosStep3: 'Tap "Add" in the top right corner.',
    iosClose: 'Got it',
  },
  de: {
    title: 'AllureTV installieren',
    desc: 'Zum Startbildschirm hinzufügen — schneller, Vollbild, ohne Browserleiste.',
    install: 'Installieren',
    dismiss: 'Schließen',
    iosCta: 'So gehts →',
    iosTitle: 'AllureTV zum Home-Bildschirm hinzufügen',
    iosStep1: 'Tippe unten in Safari auf das Teilen-Symbol.',
    iosStep2: 'Wische runter und tippe auf „Zum Home-Bildschirm".',
    iosStep3: 'Tippe oben rechts auf „Hinzufügen".',
    iosClose: 'Verstanden',
  },
  fr: {
    title: 'Installer AllureTV',
    desc: 'Ajouter à l’écran d’accueil — rapide, plein écran, sans barre.',
    install: 'Installer',
    dismiss: 'Fermer',
    iosCta: 'Voir comment →',
    iosTitle: 'Ajouter AllureTV à l’écran d’accueil',
    iosStep1: 'Appuyez sur l’icône Partager en bas de Safari.',
    iosStep2: 'Faites défiler et choisissez « Sur l’écran d’accueil ».',
    iosStep3: 'Appuyez sur « Ajouter » en haut à droite.',
    iosClose: 'Compris',
  },
  es: {
    title: 'Instalar AllureTV',
    desc: 'Añade a la pantalla de inicio — rápido, pantalla completa, sin barra.',
    install: 'Instalar',
    dismiss: 'Cerrar',
    iosCta: 'Cómo instalar →',
    iosTitle: 'Añadir AllureTV a la pantalla de inicio',
    iosStep1: 'Toca el icono de Compartir en la parte inferior de Safari.',
    iosStep2: 'Desplázate y elige "Añadir a inicio".',
    iosStep3: 'Toca "Añadir" en la esquina superior derecha.',
    iosClose: 'Entendido',
  },
};

export function InstallBanner() {
  const locale = useLocale();
  const {
    canPromptNative,
    canShowIOSGuide,
    isIOS,
    dismissed,
    iosSheetOpen,
    triggerInstall,
    dismiss,
    closeIOSSheet,
  } = useInstall();

  const t = COPY[locale] ?? COPY.en;
  // Show as soon as we know how to install — first visit, no delay.
  const showBanner = !dismissed && (canPromptNative || canShowIOSGuide);

  return (
    <>
      {showBanner && (
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
              src="/icons/icon-192.png"
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
              <p className="text-xs text-text-dim mt-1 leading-snug line-clamp-2">
                {isIOS ? t.iosCta : t.desc}
              </p>
            </div>

            <button
              onClick={triggerInstall}
              className="shrink-0 px-4 h-10 rounded-full bg-gradient-to-r from-rose to-rose-deep text-white font-bold text-sm shadow shadow-rose/30 active:scale-95 transition-transform"
            >
              {t.install}
            </button>

            <button
              onClick={dismiss}
              aria-label={t.dismiss}
              className="shrink-0 grid place-items-center size-9 rounded-full hover:bg-white/5 active:bg-white/10 text-text-dim"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {iosSheetOpen && (
        <IOSInstallSheet t={t} onClose={closeIOSSheet} onDismissPermanent={dismiss} />
      )}
    </>
  );
}

function IOSInstallSheet({
  t,
  onClose,
  onDismissPermanent,
}: {
  t: (typeof COPY)[string];
  onClose: () => void;
  onDismissPermanent: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-label={t.iosTitle}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        className="absolute inset-x-0 bottom-0 bg-bg-card rounded-t-3xl shadow-2xl shadow-black/80 border-t border-rose-bright/20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pt-3 pb-6 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={48}
              height={48}
              className="rounded-xl ring-1 ring-white/10"
              unoptimized
            />
            <h2 className="font-serif italic text-xl font-bold text-white leading-tight">
              {t.iosTitle}
            </h2>
          </div>

          <ol className="space-y-3 mb-5">
            <Step
              num={1}
              icon={<Share className="size-5 text-rose-bright" />}
              text={t.iosStep1}
            />
            <Step
              num={2}
              icon={<Plus className="size-5 text-rose-bright" />}
              text={t.iosStep2}
            />
            <Step
              num={3}
              icon={<Check className="size-5 text-rose-bright" />}
              text={t.iosStep3}
            />
          </ol>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-full bg-gradient-to-r from-rose to-rose-deep text-white font-bold shadow shadow-rose/30 active:scale-95 transition-transform"
            >
              {t.iosClose}
            </button>
            <button
              onClick={onDismissPermanent}
              aria-label={t.dismiss}
              className="size-12 grid place-items-center rounded-full bg-white/5 hover:bg-white/10 text-text-dim"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({
  num,
  icon,
  text,
}: {
  num: number;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <li className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/5">
      <span className="grid place-items-center size-8 rounded-full bg-rose/15 text-rose-bright font-bold text-sm shrink-0">
        {num}
      </span>
      <span className="shrink-0">{icon}</span>
      <p className="text-sm text-text-soft leading-snug flex-1">{text}</p>
      <ChevronRight className="size-4 text-text-mute shrink-0" />
    </li>
  );
}
