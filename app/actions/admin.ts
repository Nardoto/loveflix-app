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

/**
 * Reply to any comment as the admin (uses the admin's auth.uid as user_id).
 * Mirrors profile data to comment_user_meta so the admin's name/avatar
 * show up on the reply card on the public story page.
 */
export async function adminPostReply(input: {
  parentId: string;
  storySlug: string;
  body: string;
}): Promise<Result> {
  const text = input.body.trim();
  if (!text) return { ok: false, error: 'Resposta vazia' };
  if (text.length > 2000) return { ok: false, error: 'Resposta muito longa (máx 2000)' };

  const auth = await requireAdmin();
  if (!auth.ok || !auth.user) return { ok: false, error: 'Forbidden' };
  const admin = auth.user;

  try {
    const sb = createServiceClient();

    // Garante que o admin tem nome/avatar em comment_user_meta. Sem isso,
    // a resposta aparece como "Anônimo" no card público. Idempotente.
    const meta = (admin.user_metadata ?? {}) as Record<string, unknown>;
    const displayName =
      (meta.full_name as string | undefined) ||
      (meta.name as string | undefined) ||
      (admin.email ? admin.email.split('@')[0] : null);
    const avatarUrl =
      (meta.avatar_url as string | undefined) ||
      (meta.picture as string | undefined) ||
      null;
    if (displayName || avatarUrl) {
      await sb.from('comment_user_meta').upsert(
        {
          user_id: admin.id,
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    }

    const { error } = await sb.from('story_comment_replies').insert({
      parent_id: input.parentId,
      user_id: admin.id,
      body: text,
      // Marca como reply oficial — frontend renderiza com identidade
      // "AllureTV Team" + badge dourado OFICIAL, escondendo o display_name
      // do admin individual. Migration 0015_creator_replies.sql.
      is_creator_reply: true,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath('/admin/comments');
    revalidatePath(`/[locale]/s/${input.storySlug}`, 'page');
    revalidatePath(`/s/${input.storySlug}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
