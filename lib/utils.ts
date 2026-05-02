// shadcn/ui standard utility for merging Tailwind classes.
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Pick a localized field from a JSONB column ({en, de, fr, es})
export function pickLocale<T = string>(
  obj: Record<string, T> | null | undefined,
  locale: string,
  fallback: string = 'en',
): T | undefined {
  if (!obj) return undefined;
  return obj[locale] ?? obj[fallback];
}
