'use client';

// Singleton install state shared between the auto-banner (InstallBanner)
// and the always-available trigger in the account dropdown
// (InstallAppMenuItem). The browser fires `beforeinstallprompt` exactly
// once per page load — whichever component captures it owns the prompt
// for the rest of the session, so we centralize capture here and let
// every consumer reuse the same event.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISSED_KEY = 'alluretv-install-dismissed';

type InstallContextValue = {
  /** True when the user is already running the app as a standalone PWA. */
  isStandalone: boolean;
  /** True on iPhone/iPad/iPod (Safari / Chrome iOS — same WebKit core). */
  isIOS: boolean;
  /** True if Chrome/Edge gave us a captured `beforeinstallprompt` event. */
  canPromptNative: boolean;
  /** True when iOS Safari can offer manual Add-to-Home-Screen instructions. */
  canShowIOSGuide: boolean;
  /** Anything we can offer the user — native prompt OR iOS instructions. */
  canInstall: boolean;
  /** Persistent dismissal flag (banner stays hidden between sessions). */
  dismissed: boolean;
  /** True while the iOS step-by-step bottom sheet is open. */
  iosSheetOpen: boolean;
  /** Trigger the right install flow for this device (native or iOS sheet). */
  triggerInstall: () => Promise<void>;
  /** Close the iOS sheet without persisting dismissal. */
  closeIOSSheet: () => void;
  /** User said "no" — hide banner now and across sessions. */
  dismiss: () => void;
};

const InstallContext = createContext<InstallContextValue | null>(null);

export function InstallProvider({ children }: { children: ReactNode }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installEvent, setInstallEvent] = useState<BIPEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [iosSheetOpen, setIosSheetOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as { standalone?: boolean }).standalone);
    setIsStandalone(standalone);

    const ua = navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    if (localStorage.getItem(DISMISSED_KEY) === '1') setDismissed(true);

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BIPEvent);
    };
    const onAppInstalled = () => {
      setInstallEvent(null);
      setIsStandalone(true);
      localStorage.setItem(DISMISSED_KEY, '1');
      setDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (isIOS) {
      setIosSheetOpen(true);
      return;
    }
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      localStorage.setItem(DISMISSED_KEY, '1');
      setDismissed(true);
    }
    setInstallEvent(null);
  }, [installEvent, isIOS]);

  const closeIOSSheet = useCallback(() => setIosSheetOpen(false), []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
    setIosSheetOpen(false);
  }, []);

  const value = useMemo<InstallContextValue>(() => {
    const canPromptNative = !!installEvent && !isStandalone;
    const canShowIOSGuide = isIOS && !isStandalone;
    return {
      isStandalone,
      isIOS,
      canPromptNative,
      canShowIOSGuide,
      canInstall: canPromptNative || canShowIOSGuide,
      dismissed,
      iosSheetOpen,
      triggerInstall,
      closeIOSSheet,
      dismiss,
    };
  }, [
    installEvent,
    isStandalone,
    isIOS,
    dismissed,
    iosSheetOpen,
    triggerInstall,
    closeIOSSheet,
    dismiss,
  ]);

  return (
    <InstallContext.Provider value={value}>{children}</InstallContext.Provider>
  );
}

export function useInstall(): InstallContextValue {
  const ctx = useContext(InstallContext);
  if (!ctx) {
    // Returning a no-op default keeps the menu item harmless if it ever
    // renders outside the provider (e.g. in an isolated story).
    return {
      isStandalone: false,
      isIOS: false,
      canPromptNative: false,
      canShowIOSGuide: false,
      canInstall: false,
      dismissed: true,
      iosSheetOpen: false,
      triggerInstall: async () => {},
      closeIOSSheet: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
}
