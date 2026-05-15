// Geo detection from request headers. Cloudflare sets `cf-ipcountry`,
// Vercel mirrors via `x-vercel-ip-country`. Falls back to null.
//
// STRICT_REGIONS lists countries / US states where self-declaration is
// NOT compliant — UK/FR/DE/IE/AU require "highly effective" age assurance
// (Yoti / open banking / ID). Fase 0 only reads the country and stores it;
// the actual third-party gate lands in a later phase.

export const STRICT_COUNTRY_CODES = [
  'GB', // United Kingdom — OSA Part 5
  'IE', // Ireland
  'FR', // France — SREN Law
  'DE', // Germany — JMStV
  'AU', // Australia — Online Safety Amendment
] as const;

export type StrictCountry = (typeof STRICT_COUNTRY_CODES)[number];

export function getCountryFromHeaders(headers: Headers): string | null {
  const cf = headers.get('cf-ipcountry');
  if (cf && cf.length === 2 && cf !== 'XX') return cf.toUpperCase();
  const vercel = headers.get('x-vercel-ip-country');
  if (vercel && vercel.length === 2 && vercel !== 'XX') return vercel.toUpperCase();
  return null;
}

export function isStrictCountry(code: string | null): code is StrictCountry {
  if (!code) return false;
  return (STRICT_COUNTRY_CODES as readonly string[]).includes(code.toUpperCase());
}
