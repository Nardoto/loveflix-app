import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { Heart, CreditCard, Mail, Globe, BellRing, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getUser } from '@/lib/auth-helpers';
import { signOut } from '@/app/actions/auth';

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

  // TODO Sprint 3: query subscriptions table for real Stripe subscription state
  // when Stripe is wired up. For now we display a placeholder card so the layout
  // doesn't look empty — clearly marked as coming soon.
  const hasSubscription = false;

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

      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <div className="bg-bg-elevated rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-rose/15">
          <Badge variant={hasSubscription ? 'hot' : 'genre'} className="mb-3">
            {hasSubscription ? 'Active' : 'Free'}
          </Badge>
          <h3 className="font-serif italic text-2xl font-bold text-white mb-1">
            {hasSubscription ? 'Monthly Plan' : 'Free account'}
          </h3>
          <p className="text-text-dim text-sm mb-4">
            {hasSubscription ? (
              <>Renews on <span className="text-text-soft">soon</span></>
            ) : (
              <>Upgrade for full access to premium stories</>
            )}
          </p>
          {hasSubscription ? (
            <p className="text-3xl font-bold text-rose-bright">
              $14.99
              <span className="text-sm text-text-dim font-normal ml-1">/month</span>
            </p>
          ) : (
            <Button variant="rose" disabled>
              Upgrade — coming soon
            </Button>
          )}
          <div className="absolute -right-4 -bottom-4 text-rose/10 text-9xl pointer-events-none select-none">♥</div>
        </div>

        <div className="bg-bg-elevated rounded-2xl p-6 space-y-3 shadow-lg shadow-black/30">
          <h3 className="font-serif italic text-xl font-bold text-white">
            Manage subscription
          </h3>
          <Button variant="glass" className="w-full justify-start" disabled>
            <CreditCard /> Update payment method
          </Button>
          <Button variant="glass" className="w-full justify-start" disabled>
            <Mail /> Billing history
          </Button>
          <Button variant="ghost" className="w-full justify-start text-text-dim" disabled>
            Cancel subscription
          </Button>
          <p className="text-[11px] text-text-mute mt-3">
            Stripe Customer Portal coming soon.
          </p>
        </div>
      </div>

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
