'use server';

// Admin-only Server Actions for managing users.
//
// Safety rules baked in:
//   • requireAdmin() re-checked on every call (Server Actions are URLs).
//   • An admin can NOT delete themselves — would lock the operator out
//     mid-session. UI greys out the button on the operator's own row,
//     this is the server-side belt.
//   • An admin can NOT delete another admin (anyone in ADMIN_EMAILS).
//     Protects against one operator nuking the others. To remove an
//     admin you have to take their email out of ADMIN_EMAILS first.
//
// On success: cascades clean everything (subscriptions, comments,
// likes, replies, ratings, watch_progress) thanks to the FK
// `references auth.users on delete cascade` set up in 0001/0002/0004.

import { revalidatePath } from 'next/cache';
import { requireAdmin, getUser } from '@/lib/auth-helpers';
import { createServiceClient } from '@/lib/supabase/server';

type Result = { ok: true } | { ok: false; error: string };

const ADMIN_EMAILS_SET = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export async function deleteUser(userId: string): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: 'Forbidden' };

  if (!userId) return { ok: false, error: 'userId vazio' };

  const me = await getUser();
  if (me?.id === userId) {
    return { ok: false, error: 'Você não pode apagar a própria conta.' };
  }

  const sb = createServiceClient();

  // Resolve the target email so we can guard against deleting another
  // admin. listUsers is N=4-500ish — fine to scan in memory.
  let targetEmail: string | null = null;
  try {
    const { data } = await sb.auth.admin.getUserById(userId);
    targetEmail = data?.user?.email ?? null;
  } catch {
    return { ok: false, error: 'Não consegui localizar o usuário no Supabase.' };
  }

  if (
    targetEmail &&
    ADMIN_EMAILS_SET.has(targetEmail.toLowerCase())
  ) {
    return {
      ok: false,
      error:
        'Esse usuário é admin. Tira o email do ADMIN_EMAILS antes de apagar.',
    };
  }

  const { error } = await sb.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/users');
  revalidatePath('/admin');
  return { ok: true };
}
