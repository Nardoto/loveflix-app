'use server';

// Server Actions for the StoryComments UI.
//
// All four actions go through @supabase/ssr's cookie-bound client so RLS
// applies — the policies in supabase/migrations/0002_comments.sql require
// auth.uid() = user_id for any insert/update/delete. Reads are public.
//
// Auth model: viewers MUST be logged in to interact (like/reply/post). When
// the request comes from an unauthenticated session, the action returns
// `{ ok: false, requiresLogin: true }` and the client renders a "Sign in to
// comment" prompt instead of trying again. There is no anonymous sign-in.

import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getStoryBySlug } from '@/lib/data/stories-server';
import type { User } from '@supabase/supabase-js';

const PREVIEW_LEN = 140;
function preview(body: string): string {
  const t = body.trim().replace(/\s+/g, ' ');
  return t.length <= PREVIEW_LEN ? t : t.slice(0, PREVIEW_LEN - 1) + '…';
}

function actorIdentity(user: User): {
  displayName: string;
  avatarUrl: string | null;
} {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (meta.full_name as string | undefined) ||
    (meta.name as string | undefined) ||
    (user.email ? user.email.split('@')[0] : 'Someone');
  const avatarUrl =
    (meta.avatar_url as string | undefined) ||
    (meta.picture as string | undefined) ||
    null;
  return { displayName, avatarUrl };
}

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; requiresLogin?: boolean };

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/** Resolve current user. Returns null when not signed in. Never auto-creates. */
async function getSignedInUser(): Promise<User | null> {
  if (!SUPABASE_CONFIGURED) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

const NOT_SIGNED_IN: Result<never> = {
  ok: false,
  error: 'Sign in to interact',
  requiresLogin: true,
};

/** Mirror the user's display_name + avatar from Supabase auth metadata into
 *  comment_user_meta so the comment list joins to a real name/photo instead
 *  of falling back to "Reader #xxxx". Idempotent — run on every post. */
async function syncCommentUserMeta(user: User) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (meta.full_name as string | undefined) ||
    (meta.name as string | undefined) ||
    (user.email ? user.email.split('@')[0] : null);
  const avatarUrl =
    (meta.avatar_url as string | undefined) ||
    (meta.picture as string | undefined) ||
    null;
  if (!displayName && !avatarUrl) return;

  try {
    const supabase = await createClient();
    await supabase
      .from('comment_user_meta')
      .upsert(
        {
          user_id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
  } catch {
    // Non-fatal — comment still saves; meta just falls back to "Reader #xxxx".
  }
}


// ============================================================
// POST a top-level comment
// ============================================================
export async function postComment(input: {
  storySlug: string;
  body: string;
  stars?: number | null;
}): Promise<Result<{ id: string }>> {
  const text = input.body.trim();
  if (!text) return { ok: false, error: 'Comment cannot be empty' };
  if (text.length > 4000) return { ok: false, error: 'Comment is too long' };
  if (input.stars != null && (input.stars < 1 || input.stars > 5)) {
    return { ok: false, error: 'Invalid rating' };
  }

  const user = await getSignedInUser();
  if (!user) return NOT_SIGNED_IN;

  // Mirror the user's profile into comment_user_meta so the comment list
  // shows their real name + photo instead of "Reader #xxxx".
  await syncCommentUserMeta(user);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('story_comments')
    .insert({
      story_slug: input.storySlug,
      user_id: user.id,
      body: text,
      stars: input.stars ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[postComment] insert failed:', {
      slug: input.storySlug,
      userId: user.id,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    return { ok: false, error: error?.message ?? 'Failed to post comment' };
  }

  console.log('[postComment] inserted', { id: data.id, slug: input.storySlug });
  // Revalidate em todos os formatos possíveis. O segundo argumento 'page'
  // garante que o cache da página dinâmica seja invalidado.
  revalidatePath(`/[locale]/s/${input.storySlug}`, 'page');
  revalidatePath(`/s/${input.storySlug}`);
  return { ok: true, data: { id: data.id } };
}


// ============================================================
// TOGGLE like on a comment
// ============================================================
export async function toggleLike(input: {
  commentId: string;
  storySlug: string;
}): Promise<Result<{ liked: boolean }>> {
  const user = await getSignedInUser();
  if (!user) return NOT_SIGNED_IN;

  const supabase = await createClient();

  // Try to delete first (toggle off)
  const { data: deleted, error: delErr } = await supabase
    .from('story_comment_likes')
    .delete()
    .eq('comment_id', input.commentId)
    .eq('user_id', user.id)
    .select('comment_id');

  if (delErr) return { ok: false, error: delErr.message };
  if (deleted && deleted.length > 0) {
    revalidatePath(`/[locale]/s/${input.storySlug}`, 'page');
    return { ok: true, data: { liked: false } };
  }

  // Nothing to delete — add the like
  const { error: insErr } = await supabase
    .from('story_comment_likes')
    .insert({ comment_id: input.commentId, user_id: user.id });

  if (insErr) return { ok: false, error: insErr.message };

  // Notification: grouped like-bucket via RPC. Skip self-like.
  // Best-effort.
  try {
    const { data: parent } = await supabase
      .from('story_comments')
      .select('user_id, body, story_slug')
      .eq('id', input.commentId)
      .single();

    if (parent && parent.user_id !== user.id) {
      const sb = createServiceClient();
      const story = await getStoryBySlug(parent.story_slug ?? input.storySlug);
      const actor = actorIdentity(user);
      await sb.rpc('enqueue_like_notification', {
        p_recipient_id: parent.user_id,
        p_parent_id: input.commentId,
        p_story_slug: parent.story_slug ?? input.storySlug,
        p_story_title: story?.title ?? input.storySlug,
        p_parent_body_preview: preview(parent.body ?? ''),
        p_actor_display_name: actor.displayName,
        p_actor_avatar_url: actor.avatarUrl,
      });
    }
  } catch {
    /* swallow */
  }

  revalidatePath(`/[locale]/s/${input.storySlug}`, 'page');
  return { ok: true, data: { liked: true } };
}


// ============================================================
// POST a reply to a comment
// ============================================================
export async function postReply(input: {
  parentId: string;
  storySlug: string;
  body: string;
}): Promise<Result<{ id: string }>> {
  const text = input.body.trim();
  if (!text) return { ok: false, error: 'Reply cannot be empty' };
  if (text.length > 2000) return { ok: false, error: 'Reply is too long' };

  const user = await getSignedInUser();
  if (!user) return NOT_SIGNED_IN;
  await syncCommentUserMeta(user);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('story_comment_replies')
    .insert({
      parent_id: input.parentId,
      user_id: user.id,
      body: text,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Failed to post reply' };
  }

  // Notification: avisar o autor do comentário pai. Skip self-reply.
  // Best-effort — falha aqui não derruba a reply.
  try {
    const { data: parent } = await supabase
      .from('story_comments')
      .select('user_id, body, story_slug')
      .eq('id', input.parentId)
      .single();

    if (parent && parent.user_id !== user.id) {
      const sb = createServiceClient();
      const story = await getStoryBySlug(parent.story_slug ?? input.storySlug);
      const actor = actorIdentity(user);
      await sb.from('notifications').insert({
        user_id: parent.user_id,
        type: 'reply_user',
        payload: {
          story_slug: parent.story_slug ?? input.storySlug,
          story_title: story?.title ?? input.storySlug,
          parent_comment_id: input.parentId,
          parent_body_preview: preview(parent.body ?? ''),
          reply_id: data.id,
          reply_body_preview: preview(text),
          actor_display_name: actor.displayName,
          actor_avatar_url: actor.avatarUrl,
        },
      });
    }
  } catch {
    /* swallow */
  }

  revalidatePath(`/[locale]/s/${input.storySlug}`, 'page');
  return { ok: true, data: { id: data.id } };
}


// ============================================================
// DELETE own comment
// ============================================================
export async function deleteComment(input: {
  commentId: string;
  storySlug: string;
}): Promise<Result> {
  const user = await getSignedInUser();
  if (!user) return NOT_SIGNED_IN;

  const supabase = await createClient();
  const { error } = await supabase
    .from('story_comments')
    .delete()
    .eq('id', input.commentId)
    .eq('user_id', user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/[locale]/s/${input.storySlug}`, 'page');
  return { ok: true, data: undefined };
}


// ============================================================
// EDIT own comment
// ============================================================
export async function editComment(input: {
  commentId: string;
  storySlug: string;
  body: string;
  stars?: number | null;
}): Promise<Result> {
  const text = input.body.trim();
  if (!text) return { ok: false, error: 'Comment cannot be empty' };
  if (text.length > 4000) return { ok: false, error: 'Comment is too long' };
  if (input.stars != null && (input.stars < 1 || input.stars > 5)) {
    return { ok: false, error: 'Invalid rating' };
  }

  const user = await getSignedInUser();
  if (!user) return NOT_SIGNED_IN;

  const supabase = await createClient();
  // Belt-and-suspenders: filter on user_id even though RLS already enforces
  // it — this way a tampered commentId from the client returns 0 rows
  // updated instead of "succeeding" against someone else's row.
  const { data, error } = await supabase
    .from('story_comments')
    .update({
      body: text,
      stars: input.stars ?? null,
    })
    .eq('id', input.commentId)
    .eq('user_id', user.id)
    .select('id');

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: 'Comment not found or not yours' };
  }

  revalidatePath(`/[locale]/s/${input.storySlug}`, 'page');
  return { ok: true, data: undefined };
}
