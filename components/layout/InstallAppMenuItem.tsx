'use client';

// Always-available "Install app" trigger that lives inside the account
// dropdown. Independent of the auto-banner — even after the user
// dismissed it, the menu item stays here so they can install on demand.
//
// Renders nothing when:
//   • the app is already running as a standalone PWA (display-mode), or
//   • the browser can't actually offer install (desktop Firefox, etc.)
// On Chromium it triggers the captured `beforeinstallprompt` directly;
// on iOS Safari it opens the step-by-step bottom sheet.

import { Download } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useInstall } from './InstallProvider';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

const LABELS: Record<string, string> = {
  en: 'Install app',
  de: 'App installieren',
  fr: 'Installer l’app',
  es: 'Instalar app',
};

export function InstallAppMenuItem() {
  const locale = useLocale();
  const { canInstall, triggerInstall } = useInstall();

  if (!canInstall) return null;

  const label = LABELS[locale] ?? LABELS.en;

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={(e) => {
          // Keep the dropdown open while the install dialog (Chrome) or
          // the iOS sheet animates in — Radix would close otherwise and
          // the user would lose context.
          e.preventDefault();
          void triggerInstall();
        }}
      >
        <Download className="size-4 text-rose-bright" />
        <span className="font-semibold text-rose-bright">{label}</span>
      </DropdownMenuItem>
    </>
  );
}
