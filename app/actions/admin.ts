'use server';

// Admin-only Server Actions. Each one re-checks requireAdmin() before doing
// anything mutating — never trust that the layout gate alone is enough,
// because Server Actions are addressable URLs.

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-helpers';
import { createServiceClient } from '@/lib/supabase/server';

type Result = { ok: true } | { ok: false; error: string };

/** Delete any user's comment (and cascade likes + replies via FK). */
export async function adminDeleteComment(commentId: string): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: 'Forbidden' };

  try {
    const sb = createServiceClient();
    const { error } = await sb
      .from('story_comments')
      .delete()
      .eq('id', commentId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/comments');
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/** Delete any reply. */
export async function adminDeleteReply(replyId: string): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: 'Forbidden' };

  try {
    const sb = createServiceClient();
    const { error } = await sb
      .from('story_comment_replies')
      .delete()
      .eq('id', replyId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/comments');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
