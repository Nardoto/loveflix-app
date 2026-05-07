'use client';

// Singleton install state shared between the auto-banner (InstallBanner)
// and the always-available trigger in the account dropdown
// (InstallAppMenuItem). The browser fires `beforeinstallprompt` exactly
// once per page load — whichever component captures it owns the prompt
// for the rest of the session, so we centralize capture here and let
// every consumer reuse the same event.
//
// iOS gotcha: Apple does NOT expose `beforeinstallprompt`. Worse, only
// Safari (WebKit-without-the-Chrome-skin) can actually run the
// Add-to-Home-Screen flow — Chrome iOS / Firefox iOS / Edge iOS use
// WebKit but Apple disables A2HS for them. So we distinguish:
//   • isIOSSafari → real Safari, can show install instructions
//   • needsSafariSwitch → on iOS but in another browser, must switch
//   • Android Chromium → captures beforeinstallprompt → native dialog

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

export type InstallDebug = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  displayMode: string;
  standaloneFlag: boolean;
  serviceWorkerSupported: boolean;
  capturedBIP: boolean;
  secureContext: boolean;
  detectedAs: string;
};

type InstallContextValue = {
  isStandalone: boolean;
  isIOS: boolean;
  /** True only when the user is in iOS SAFARI specifically (the only iOS
      browser Apple lets do Add-to-Home-Screen). */
  isIOSSafari: boolean;
  /** True if Chrome/Edge gave us a captured `beforeinstallprompt`. */
  canPromptNative: boolean;
  /** True when iOS Safari can offer manual Add-to-Home-Screen instructions. */
  canShowIOSGuide: boolean;
  /** Anything we can offer the user — native prompt OR iOS Safari instructions. */
  canInstall: boolean;
  /** True when user is on iOS but NOT in Safari — must switch to Safari. */
  needsSafariSwitch: boolean;
  dismissed: boolean;
  iosSheetOpen: boolean;
  /** Raw debug snapshot — the /install-debug page renders this. */
  debug: InstallDebug;
  triggerInstall: () => Promise<void>;
  closeIOSSheet: () => void;
  dismiss: () => void;
};

const EMPTY_DEBUG: InstallDebug = {
  userAgent: '',
  platform: '',
  maxTouchPoints: 0,
  displayMode: 'unknown',
  standaloneFlag: false,
  serviceWorkerSupported: false,
  capturedBIP: false,
  secureContext: false,
  detectedAs: 'server',
};

const InstallContext = createContext<InstallContextValue | null>(null);

function detect(): {
  isIOS: boolean;
  isIOSSafari: boolean;
  isStandalone: boolean;
  debug: InstallDebug;
} {
  if (typeof window === 'undefined') {
    return {
      isIOS: false,
      isIOSSafari: false,
      isStandalone: false,
      debug: { ...EMPTY_DEBUG },
    };
  }
  const ua = navigator.userAgent;
  const platform = navigator.platform || '';
  const touch = navigator.maxTouchPoints || 0;

  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === 'MacIntel' && touch > 1);

  // iOS Chrome → CriOS, Firefox → FxiOS, Edge → EdgiOS, Opera → OPiOS,
  // Brave/DuckDuckGo etc → varied UAs but Safari has none of these tokens.
  // True Safari UA: contains "Safari/" but NOT "CriOS|FxiOS|EdgiOS|OPiOS".
  const isIOSSafari =
    isIOS &&
    /Safari/.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);

  const displayMode = window.matchMedia('(display-mode: standalone)').matches
    ? 'standalone'
    : window.matchMedia('(display-mode: minimal-ui)').matches
      ? 'minimal-ui'
      : window.matchMedia('(display-mode: fullscreen)').matches
        ? 'fullscreen'
        : 'browser';

  const standaloneFlag = Boolean((window.navigator as { standalone?: boolean }).standalone);
  const isStandalone = displayMode === 'standalone' || standaloneFlag;

  let detectedAs = 'desktop';
  if (isIOS) detectedAs = isIOSSafari ? 'iOS Safari' : 'iOS (não-Safari)';
  else if (/Android/.test(ua)) detectedAs = 'Android';

  return {
    isIOS,
    isIOSSafari,
    isStandalone,
    debug: {
      userAgent: ua,
      platform,
      maxTouchPoints: touch,
      displayMode,
      standaloneFlag,
      serviceWorkerSupported: 'serviceWorker' in navigator,
      capturedBIP: false,
      secureContext: window.isSecureContext === true,
      detectedAs,
    },
  };
}

export function InstallProvider({ children }: { children: ReactNode }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [installEvent, setInstallEvent] = useState<BIPEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [iosSheetOpen, setIosSheetOpen] = useState(false);
  const [debug, setDebug] = useState<InstallDebug>(EMPTY_DEBUG);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const d = detect();
    setIsIOS(d.isIOS);
    setIsIOSSafari(d.isIOSSafari);
    setIsStandalone(d.isStandalone);
    setDebug({ ...d.debug, capturedBIP: false });

    if (localStorage.getItem(DISMISSED_KEY) === '1') setDismissed(true);

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BIPEvent);
      setDebug((prev) => ({ ...prev, capturedBIP: true }));
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
    if (isIOSSafari) {
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
  }, [installEvent, isIOSSafari]);

  const closeIOSSheet = useCallback(() => setIosSheetOpen(false), []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
    setIosSheetOpen(false);
  }, []);

  const value = useMemo<InstallContextValue>(() => {
    const canPromptNative = !!installEvent && !isStandalone;
    const canShowIOSGuide = isIOSSafari && !isStandalone;
    const needsSafariSwitch = isIOS && !isIOSSafari && !isStandalone;
    return {
      isStandalone,
      isIOS,
      isIOSSafari,
      canPromptNative,
      canShowIOSGuide,
      canInstall: canPromptNative || canShowIOSGuide,
      needsSafariSwitch,
      dismissed,
      iosSheetOpen,
      debug,
      triggerInstall,
      closeIOSSheet,
      dismiss,
    };
  }, [
    installEvent,
    isStandalone,
    isIOS,
    isIOSSafari,
    dismissed,
    iosSheetOpen,
    debug,
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
    return {
      isStandalone: false,
      isIOS: false,
      isIOSSafari: false,
      canPromptNative: false,
      canShowIOSGuide: false,
      canInstall: false,
      needsSafariSwitch: false,
      dismissed: true,
      iosSheetOpen: false,
      debug: EMPTY_DEBUG,
      triggerInstall: async () => {},
      closeIOSSheet: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
}
