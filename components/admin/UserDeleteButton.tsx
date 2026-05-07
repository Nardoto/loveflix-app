'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { deleteUser } from '@/app/actions/admin-users';

type Props = {
  userId: string;
  userLabel: string;        // "Glenda Barbosa" or email — for the confirm()
  /** True when the row is the operator themselves OR another admin —
      the button renders disabled with a tooltip. */
  disabled?: boolean;
  disabledReason?: string;
};

export function UserDeleteButton({
  userId,
  userLabel,
  disabled,
  disabledReason,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (disabled) {
    return (
      <span
        title={disabledReason}
        aria-label={disabledReason}
        className="grid place-items-center size-8 rounded-lg text-text-mute/40 cursor-not-allowed"
      >
        <Trash2 className="size-4" />
      </span>
    );
  }

  const onClick = () => {
    if (
      !confirm(
        `Apagar "${userLabel}" pra sempre? A conta no Supabase Auth e todos os dados ligados a ela (comentários, likes, assinatura) são removidos.`,
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const res = await deleteUser(userId);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
        alert(`Falhou: ${res.error}`);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label="Apagar usuário"
      title="Apagar usuário"
      className="grid place-items-center size-8 rounded-lg text-text-dim hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/15 transition-colors disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
      {error && <span className="sr-only">Erro: {error}</span>}
    </button>
  );
}
