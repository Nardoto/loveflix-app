import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth-helpers';
import { signMediaToken, type MediaTokenClaims } from '@/lib/media-token';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Resolve subscription tier from Supabase. Schema is created in Sprint 1; until
  // then we treat any logged-in user as `free` so the Worker still gates Book 2+.
  let tier: MediaTokenClaims['tier'] = 'free';
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data?.status === 'active' || data?.status === 'trialing') {
      tier = data.status;
    }
  } catch {
    // Table may not exist yet — leave tier = 'free'.
  }

  // Admin override — operators in ADMIN_EMAILS always get full playback so
  // they can QA premium content without seeding a fake subscription row.
  // The Worker doesn't care WHY tier is "active"; the JWT signature is what
  // it verifies, and only this endpoint can mint one.
  const email = user.email?.toLowerCase();
  if (tier === 'free' && email && ADMIN_EMAILS.includes(email)) {
    tier = 'active';
  }

  const expirySeconds = 7200;
  const token = await signMediaToken({ userId: user.id, tier, expirySeconds });

  return NextResponse.json({ token, tier, expiresIn: expirySeconds });
}
