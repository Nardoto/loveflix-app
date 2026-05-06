import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { Heart, Globe, BellRing, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth-helpers';
import { signOut } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { AccountSubscription } from '@/components/account/AccountSubscription';

// Supabase Google OAuth populates user.user_metadata with these fields:
//   - full_name | name
//   - avatar_url | picture
//   - email | preferred_username
// Magic-link sign-in only fills `email` (no avatar/name yet) — that's why we
// fall back to the email's local-part for display name and a heart glyph
// for the avatar tile.

function pickDisplayName(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}): string {
  const md = user.user_metadata ?? {};
  const fullName = (md.full_name || md.name) as string | undefined;
  if (fullName) return fullName;
  if (user.email) return user.email.split('@')[0];
  return 'You';
}

function pickAvatar(user: {
  user_metadata?: Record<string, unknown>;
}): string | null {
  const md = user.user_metadata ?? {};
  return (md.avatar_url || md.picture) as string | null ?? null;
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) {
    redirect(`/${locale}/login?returnTo=${encodeURIComponent(`/${locale}/account`)}`);
  }

  const displayName = pickDisplayName(user);
  const avatarUrl = pickAvatar(user);
  const email = user.email ?? '';

  // Pull live subscription state from Supabase (RLS limits to own row).
  // If the table doesn't exist yet (migration 0004 not run), or there's no
  // row for this user, we render the "Free" state.
  let subscription: {
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null = null;
  try {
    const sb = await createClient();
    const { data } = await sb
      .from('subscriptions')
      .select('status, current_period_end, cancel_at_period_end')
      .eq('user_id', user.id)
      .maybeSingle();
    subscription = data ?? null;
  } catch {
    subscription = null;
  }

  const hasStripe = !!process.env.STRIPE_SECRET_KEY;

  return (
    <div className="pt-24 md:pt-28 px-5 md:px-10 lg:px-14 max-w-4xl mx-auto pb-20">
      <header className="flex items-center gap-4 mb-10">
        {avatarUrl ? (
          <span className="relative size-16 md:size-20 rounded-full overflow-hidden bg-bg-deep ring-2 ring-rose-bright/30 shrink-0 shadow-xl shadow-rose/30">
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
              priority
            />
          </span>
        ) : (
          <div className="size-16 md:size-20 rounded-full bg-gradient-to-br from-rose to-rose-deep flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-rose/30 shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-text-mute">
            Welcome back
          </p>
          <h1 className="font-serif italic text-2xl sm:text-3xl md:text-4xl font-bold text-white truncate">
            {displayName}
          </h1>
          <p className="text-text-dim text-sm mt-1 truncate">{email}</p>
        </div>
      </header>

      <AccountSubscription subscription={subscription} hasStripe={hasStripe} />

      <section className="mb-10">
        <h2 className="font-serif italic text-2xl font-bold text-white mb-4">
          Preferences
        </h2>
        <div className="bg-bg-elevated rounded-2xl shadow-lg shadow-black/30 [&>*+*]:relative [&>*+*]:before:absolute [&>*+*]:before:left-5 [&>*+*]:before:right-5 [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:bg-white/5">
          <PreferenceRow icon={<Globe />} label="Language" value={locale.toUpperCase()} />
          <PreferenceRow icon={<BellRing />} label="Notifications" value="Allowed" />
          <PreferenceRow icon={<Heart />} label="Mature content" value="On" />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-serif italic text-2xl font-bold text-white mb-4">
          My List
        </h2>
        <div className="bg-bg-elevated rounded-2xl p-6 text-center text-text-dim shadow-lg shadow-black/30">
          <p>Your favorited stories will appear here.</p>
        </div>
      </section>

      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          className="text-rose hover:text-rose-bright"
        >
          <LogOut /> Sign out
        </Button>
      </form>
    </div>
  );
}

function PreferenceRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <span className="text-rose-bright [&_svg]:size-5">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      <span className="text-text-dim">{value}</span>
    </div>
  );
}
