// Admin-only endpoint to onboard a Stripe Connect Express destination
// account under this platform. The returned `url` is a hosted Stripe
// onboarding link (KYC, banking details) — open it once, complete KYC,
// then paste the returned `accountId` into STRIPE_CONNECT_DESTINATION_ID.
//
// Auth: requireAdmin (email must be in ADMIN_EMAILS).
// Usage: POST /api/admin/connect/onboard  { email, name?, country? }

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { requireAdmin } from '@/lib/auth-helpers';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  country: z.string().length(2).optional(),
});

async function appOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL || 'https://alluretv.net';
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { email, name, country } = parsed.data;

  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: country ?? 'BR',
      email,
      capabilities: {
        transfers: { requested: true },
      },
      business_profile: name ? { name } : undefined,
      metadata: { source: 'alluretv-revenue-share' },
    });

    const origin = await appOrigin();
    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/admin?connect=refresh`,
      return_url: `${origin}/admin?connect=done&account=${account.id}`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      accountId: account.id,
      url: link.url,
      expiresAt: link.expires_at,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[connect onboard] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
