import { Lock } from 'lucide-react';

// Thin amber banner that confirms to the operator they're authenticated
// AND that this area is gated. Matches the mockup at
// apresentacao-app/admin-mockup.html — the "Acesso restrito a
// administradores" strip above the page title.
export function AdminLockBanner({ email }: { email: string | null }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 mb-6 rounded-xl text-[12.5px] text-gold-bright bg-gradient-to-r from-gold/[0.10] to-transparent border border-gold/[0.25]">
      <Lock className="size-4 shrink-0" />
      <span>
        Acesso restrito a administradores · verificado por email
        {email && (
          <>
            {' '}
            · <strong className="text-white">{email}</strong>
          </>
        )}
      </span>
    </div>
  );
}
