import { setRequestLocale } from 'next-intl/server';
import { Heart, CreditCard, Mail, Globe, BellRing, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="pt-24 md:pt-28 px-5 md:px-10 lg:px-14 max-w-4xl mx-auto pb-20">
      <header className="flex items-center gap-4 mb-10">
        <div className="size-16 md:size-20 rounded-full bg-gradient-to-br from-rose to-rose-deep flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-rose/30">
          ♥
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-text-mute">
            Welcome back
          </p>
          <h1 className="font-serif italic text-3xl md:text-4xl font-bold text-white">
            Demo User
          </h1>
          <p className="text-text-dim text-sm mt-1">demo@alluretv.net</p>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <div className="bg-bg-elevated rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-rose/15">
          <Badge variant="hot" className="mb-3">
            Active
          </Badge>
          <h3 className="font-serif italic text-2xl font-bold text-white mb-1">
            Monthly Plan
          </h3>
          <p className="text-text-dim text-sm mb-4">
            Renews on{' '}
            <span className="text-text-soft">June 3, 2026</span>
          </p>
          <p className="text-3xl font-bold text-rose-bright">
            $14.99
            <span className="text-sm text-text-dim font-normal ml-1">/month</span>
          </p>
          <div className="absolute -right-4 -bottom-4 text-rose/10 text-9xl">♥</div>
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
            Stripe Customer Portal coming Sprint 3.
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
          <p className="text-xs text-text-mute mt-2">Sprint 1 wires this to Supabase.</p>
        </div>
      </section>

      <Button variant="ghost" className="text-rose hover:text-rose-bright" disabled>
        <LogOut /> Sign out
      </Button>
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
