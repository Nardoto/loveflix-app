'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth-helpers';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  TERMS_VERSION,
  type VerificationMethod,
  isAdult,
  parseDob,
  dobToIsoDate,
} from '@/lib/age/verify';
import { getCountryFromHeaders } from '@/lib/geo/country';

export type VerifyAgeResult =
  | { ok: true }
  | { ok: false; error: 'AGE_BELOW_18' | 'INVALID_DOB' | 'TERMS_REQUIRED' | 'NOT_AUTHENTICATED' | 'UNKNOWN' };

const RETURN_TO_FALLBACK = '/';

function hash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function safeReturnTo(input: FormDataEntryValue | null): string {
  if (typeof input !== 'string') return RETURN_TO_FALLBACK;
  if (!input.startsWith('/')) return RETURN_TO_FALLBACK;
  if (input.startsWith('/verify-age') || input.includes('/verify-age')) {
    return RETURN_TO_FALLBACK;
  }
  return input;
}

export async function submitAgeVerification(formData: FormData): Promise<VerifyAgeResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: 'NOT_AUTHENTICATED' };

  const year = formData.get('year');
  const month = formData.get('month');
  const day = formData.get('day');
  const accepted = formData.get('terms_accepted');

  if (accepted !== 'on' && accepted !== 'true') {
    return { ok: false, error: 'TERMS_REQUIRED' };
  }

  const dob = parseDob(String(year ?? ''), String(month ?? ''), String(day ?? ''));
  if (!dob) return { ok: false, error: 'INVALID_DOB' };

  if (!isAdult(dob)) {
    await logEvent(user.id, 'self_declaration', 'fail').catch(() => {});
    return { ok: false, error: 'AGE_BELOW_18' };
  }

  const method: VerificationMethod = 'self_declaration';
  const country = getCountryFromHeaders(await headers());

  const supabase = await createClient();
  const { error } = await supabase.rpc('verify_age_self', {
    p_dob: dobToIsoDate(dob),
    p_method: method,
    p_terms_version: TERMS_VERSION,
    p_country: country,
  });

  if (error) {
    if (error.message?.includes('AGE_BELOW_18')) {
      return { ok: false, error: 'AGE_BELOW_18' };
    }
    console.error('[verify-age] rpc failed', error);
    return { ok: false, error: 'UNKNOWN' };
  }

  await logEvent(user.id, method, 'pass', country).catch(() => {});

  return { ok: true };
}

export async function completeVerificationAndRedirect(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formData.get('returnTo'));
  const result = await submitAgeVerification(formData);

  if (!result.ok) {
    const params = new URLSearchParams({ error: result.error });
    const rt = formData.get('returnTo');
    if (typeof rt === 'string' && rt.startsWith('/')) {
      params.set('returnTo', rt);
    }
    redirect(`/verify-age?${params.toString()}`);
  }

  redirect(returnTo);
}

async function logEvent(
  userId: string,
  method: VerificationMethod,
  result: 'pass' | 'fail' | 'pending' | 'expired',
  country: string | null = null,
): Promise<void> {
  const h = await headers();
  const ip =
    h.get('cf-connecting-ip') ??
    h.get('x-real-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null;
  const ua = h.get('user-agent') ?? null;
  const salt =
    process.env.AGE_AUDIT_SALT ?? new Date().toISOString().slice(0, 10);

  const sb = createServiceClient();
  await sb.from('age_verification_events').insert({
    user_id: userId,
    method,
    result,
    ip_hash: ip ? hash(`${ip}|${salt}`) : null,
    country_code: country,
    user_agent_hash: ua ? hash(`${ua}|${salt}`) : null,
    provider: 'self',
  });
}
