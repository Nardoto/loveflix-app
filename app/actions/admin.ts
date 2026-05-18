'use server';

// Admin-only Server Actions. Each one re-checks requireAdmin() before doing
// anything mutating — never trust that the layout gate alone is enough,
// because Server Actions are addressable URLs.

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-helpers';
import { createServiceClient } from '@/lib/supabase/server';
import { getStoryBySlug } from '@/lib/data/stories-server';

type Result = { ok: true } | { ok: false; error: string };

const PREVIEW_LEN = 140;
function preview(body: string): string {
  const t = body.trim().replace(/\s+/g, ' ');
  return t.length <= PREVIEW_LEN ? t : t.slice(0, PREVIEW_LEN - 1) + '…';
}

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

    const { data: insertedReply, error } = await sb
      .from('story_comment_replies')
      .insert({
        parent_id: input.parentId,
        user_id: admin.id,
        body: text,
        // Marca como reply oficial — frontend renderiza com identidade
        // "AllureTV Team" + badge dourado OFICIAL, escondendo o display_name
        // do admin individual. Migration 0015_creator_replies.sql.
        is_creator_reply: true,
      })
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };

    // Notification: avisar o autor do comentário que recebeu uma resposta
    // oficial. Best-effort — uma falha aqui não derruba a reply em si.
    try {
      const { data: parent } = await sb
        .from('story_comments')
        .select('user_id, body, story_slug')
        .eq('id', input.parentId)
        .single();

      if (parent && parent.user_id !== admin.id) {
        const story = await getStoryBySlug(parent.story_slug ?? input.storySlug);
        await sb.from('notifications').insert({
          user_id: parent.user_id,
          type: 'reply_official',
          payload: {
            story_slug: parent.story_slug ?? input.storySlug,
            story_title: story?.title ?? input.storySlug,
            parent_comment_id: input.parentId,
            parent_body_preview: preview(parent.body ?? ''),
            reply_id: insertedReply?.id,
            reply_body_preview: preview(text),
          },
        });
      }
    } catch {
      // Swallow — reply já está no banco.
    }

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


/**
 * Publica uma announcement broadcast pra todos os usuários autenticados.
 * Aparece no bell deles em tempo real (realtime INSERT) ou no próximo
 * fetch da página/dropdown. Lida pelo modelo announcement_reads.
 */
export async function postAnnouncement(input: {
  title: string;
  body: string;
  linkPath?: string | null;
}): Promise<Result> {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) return { ok: false, error: 'Title is required' };
  if (title.length > 200) return { ok: false, error: 'Title is too long (max 200)' };
  if (!body) return { ok: false, error: 'Body is required' };
  if (body.length > 2000) return { ok: false, error: 'Body is too long (max 2000)' };

  const auth = await requireAdmin();
  if (!auth.ok || !auth.user) return { ok: false, error: 'Forbidden' };

  try {
    const sb = createServiceClient();
    const linkPath = input.linkPath?.trim() || null;
    const { error } = await sb.from('announcements').insert({
      title,
      body,
      link_path: linkPath,
      created_by: auth.user.id,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath('/admin/announcements');
    revalidatePath('/[locale]/notifications', 'page');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/** Delete an announcement (cascades reads). */
export async function deleteAnnouncement(id: string): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: 'Forbidden' };

  try {
    const sb = createServiceClient();
    const { error } = await sb.from('announcements').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/announcements');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
