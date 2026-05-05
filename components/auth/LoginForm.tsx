'use client';

import { useState } from 'react';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

export function LoginForm({
  returnTo,
  initialError,
}: {
  returnTo: string;
  initialError?: string;
}) {
  const [mode, setMode] = useState<'choose' | 'email'>('choose');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<'google' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const supabase = createClient();

  // Site origin for OAuth redirect — Supabase needs an absolute URL
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  const redirectTo = `${origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;

  const signInWithGoogle = async () => {
    setError(null);
    setLoading('google');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
    // On success, browser is redirected to Google — no further code runs.
  };

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading('email');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(null);
    if (error) {
      setError(error.message);
      return;
    }
    setMagicLinkSent(true);
  };

  if (magicLinkSent) {
    return (
      <div className="bg-bg-elevated rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/40 text-center">
        <div className="grid place-items-center size-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white mx-auto mb-4 shadow-lg shadow-emerald-500/30">
          <CheckCircle2 className="size-7" />
        </div>
        <h2 className="font-serif italic text-2xl font-bold text-white mb-2">
          Check your email
        </h2>
        <p className="text-text-dim text-sm leading-relaxed mb-1">
          We sent a magic link to
        </p>
        <p className="font-bold text-white mb-4 break-all">{email}</p>
        <p className="text-text-mute text-xs leading-relaxed">
          Click the link in the email to finish signing in. The link works for
          one hour. You can close this tab — opening the email on any device
          will sign you in there.
        </p>
        <button
          type="button"
          onClick={() => {
            setMagicLinkSent(false);
            setMode('choose');
            setEmail('');
          }}
          className="mt-6 text-sm text-text-dim hover:text-rose-bright transition-colors"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="bg-bg-elevated rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/40 space-y-3">
      {/* Google sign-in */}
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading !== null}
        className="w-full h-12 rounded-xl bg-white text-zinc-900 font-bold inline-flex items-center justify-center gap-3 hover:bg-zinc-100 active:scale-[0.99] transition-all disabled:opacity-60 shadow-lg"
      >
        {loading === 'google' ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <GoogleLogo />
        )}
        <span>Continue with Google</span>
      </button>

      <div className="flex items-center gap-3 my-2">
        <div className="h-px bg-white/10 flex-1" />
        <span className="text-xs text-text-mute uppercase tracking-widest">
          or
        </span>
        <div className="h-px bg-white/10 flex-1" />
      </div>

      {/* Email magic-link */}
      {mode === 'choose' ? (
        <button
          type="button"
          onClick={() => setMode('email')}
          disabled={loading !== null}
          className="w-full h-12 rounded-xl bg-bg-deep border border-white/10 text-white font-bold inline-flex items-center justify-center gap-3 hover:border-rose-bright/40 hover:bg-bg-deep/80 active:scale-[0.99] transition-all disabled:opacity-60"
        >
          <Mail className="size-5" />
          <span>Continue with email</span>
        </button>
      ) : (
        <form onSubmit={sendMagicLink} className="space-y-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-text-mute mb-2 block">
              Email
            </span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full h-12 bg-bg-deep rounded-xl px-4 text-white placeholder:text-text-mute focus:outline-none focus:ring-2 focus:ring-rose/40 border border-white/10"
            />
          </label>
          <Button
            type="submit"
            variant="rose"
            className="w-full h-12"
            disabled={!email.trim() || loading !== null}
          >
            {loading === 'email' ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Sending link…
              </>
            ) : (
              <>
                <Mail className="size-4" /> Send magic link
              </>
            )}
          </Button>
          <button
            type="button"
            onClick={() => {
              setMode('choose');
              setEmail('');
            }}
            className="w-full text-sm text-text-dim hover:text-rose-bright transition-colors py-1"
          >
            ← Back
          </button>
        </form>
      )}

      {error && (
        <p className="text-sm text-rose-bright text-center pt-2 leading-relaxed">
          {error}
        </p>
      )}
    </div>
  );
}

// Google "G" mark — inline so we don't ship another icon dependency.
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.1l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.1z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
