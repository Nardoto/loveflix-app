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
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

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
    return { ok: false, error: error?.message ?? 'Failed to post comment' };
  }

  revalidatePath(`/[locale]/s/${input.storySlug}`, 'page');
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
