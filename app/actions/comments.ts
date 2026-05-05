'use server';

// Server Actions for the StoryComments UI.
//
// All four actions go through @supabase/ssr's cookie-bound client so RLS
// applies — the policies in supabase/migrations/0002_comments.sql require
// auth.uid() = user_id for any insert/update/delete. Reads are public.
//
// When the user has no session yet, we sign them in anonymously (one-shot,
// stored in cookies). That gives them a stable auth.uid() so likes/replies
// pass the RLS check. They can still upgrade to a real account later — the
// anonymous user_id remains theirs.
//
// IMPORTANT: anonymous sign-in needs to be ENABLED in
//   Supabase → Authentication → Providers → Anonymous Sign-Ins.
// If it's disabled, ensureSession returns null and the client falls back
// to the local-only optimistic UI.

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/** Resolve current user, signing in anonymously if missing. Null = auth disabled. */
async function ensureSession(): Promise<User | null> {
  if (!SUPABASE_CONFIGURED) return null;

  const supabase = await createClient();
  const { data: existing } = await supabase.auth.getUser();
  if (existing.user) return existing.user;

  // No session — try anonymous sign-in
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) return null;
  return data.user;
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

  const user = await ensureSession();
  if (!user) return { ok: false, error: 'Could not sign in. Try again later.' };

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
  const user = await ensureSession();
  if (!user) return { ok: false, error: 'Could not sign in. Try again later.' };

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

  const user = await ensureSession();
  if (!user) return { ok: false, error: 'Could not sign in. Try again later.' };

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
  const user = await ensureSession();
  if (!user) return { ok: false, error: 'Not signed in' };

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
