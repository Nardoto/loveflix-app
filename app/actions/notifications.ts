'use server';

// Server actions for the in-app notification bell.
//
// Data flow:
//   getMyNotifications() merges two sources into one normalized list:
//     1) notifications  — personal events (replies, likes), 1 row per event,
//                          read state = read_at column
//     2) announcements  — platform broadcasts, 1 row total, read state =
//                          presence in announcement_reads(announcement_id,user_id)
//
// All actions use the cookie-bound client so RLS applies — user only ever
// touches their own data. Inserts of notification rows happen in
// app/actions/admin.ts and app/actions/comments.ts (under service_role).

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ============================================================
// Shared types
// ============================================================

export type NotificationSource = 'notification' | 'announcement';

export type NotificationType =
  | 'reply_official'
  | 'reply_user'
  | 'comment_like'
  | 'announcement';

export type NotificationPayload = {
  story_slug?: string;
  story_title?: string;
  parent_comment_id?: string;
  parent_body_preview?: string;
  reply_id?: string;
  reply_body_preview?: string;
  actor_display_name?: string;
  actor_avatar_url?: string | null;
  like_count?: number;
  // Announcement-only:
  title?: string;
  body?: string;
  link_path?: string | null;
};

export type NotificationItem = {
  id: string;
  source: NotificationSource;
  type: NotificationType;
  payload: NotificationPayload;
  read_at: string | null;
  created_at: string;
};

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; requiresLogin?: boolean };

// ============================================================
// Fetch notifications + announcements, merged + sorted
// ============================================================

export async function getMyNotifications(opts?: {
  limit?: number;
  includeRead?: boolean;
}): Promise<Result<NotificationItem[]>> {
  if (!SUPABASE_CONFIGURED) return { ok: true, data: [] };

  const limit = Math.min(opts?.limit ?? 20, 100);
  const includeRead = opts?.includeRead ?? false;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    return { ok: false, error: 'Not signed in', requiresLogin: true };
  }

  // Personal notifications (RLS filters by user_id automatically).
  const notifQuery = supabase
    .from('notifications')
    .select('id, type, payload, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (!includeRead) notifQuery.is('read_at', null);

  // Announcements + this user's read state (LEFT JOIN via foreign-key alias
  // is awkward in PostgREST; fetch separately and merge).
  const annQuery = supabase
    .from('announcements')
    .select('id, title, body, link_path, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  const readsQuery = supabase
    .from('announcement_reads')
    .select('announcement_id, read_at');

  const [notifRes, annRes, readsRes] = await Promise.all([
    notifQuery,
    annQuery,
    readsQuery,
  ]);

  if (notifRes.error) {
    return { ok: false, error: notifRes.error.message };
  }
  if (annRes.error) {
    return { ok: false, error: annRes.error.message };
  }

  const readMap = new Map<string, string>();
  for (const row of readsRes.data ?? []) {
    readMap.set(row.announcement_id, row.read_at);
  }

  const notifItems: NotificationItem[] = (notifRes.data ?? []).map((r) => ({
    id: r.id,
    source: 'notification',
    type: r.type as NotificationType,
    payload: (r.payload ?? {}) as NotificationPayload,
    read_at: r.read_at,
    created_at: r.created_at,
  }));

  const annItems: NotificationItem[] = [];
  for (const r of annRes.data ?? []) {
    const read = readMap.get(r.id) ?? null;
    if (!includeRead && read) continue;
    annItems.push({
      id: r.id,
      source: 'announcement',
      type: 'announcement',
      payload: {
        title: r.title,
        body: r.body,
        link_path: r.link_path,
      },
      read_at: read,
      created_at: r.created_at,
    });
  }

  const merged = [...notifItems, ...annItems]
    .sort((a, b) => {
      // Unread first, then newest first.
      const aUnread = a.read_at == null ? 0 : 1;
      const bUnread = b.read_at == null ? 0 : 1;
      if (aUnread !== bUnread) return aUnread - bUnread;
      return b.created_at.localeCompare(a.created_at);
    })
    .slice(0, limit);

  return { ok: true, data: merged };
}

// ============================================================
// Unread count (cheap aggregate for the badge)
// ============================================================

export async function getUnreadCount(): Promise<Result<number>> {
  if (!SUPABASE_CONFIGURED) return { ok: true, data: 0 };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { ok: true, data: 0 };

  const [notifRes, annRes, readsRes] = await Promise.all([
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null),
    supabase.from('announcements').select('id'),
    supabase.from('announcement_reads').select('announcement_id'),
  ]);

  const notifUnread = notifRes.count ?? 0;
  const readSet = new Set((readsRes.data ?? []).map((r) => r.announcement_id));
  const annUnread = (annRes.data ?? []).filter((a) => !readSet.has(a.id)).length;

  return { ok: true, data: notifUnread + annUnread };
}

// ============================================================
// Mark single as read
// ============================================================

export async function markAsRead(input: {
  id: string;
  source: NotificationSource;
}): Promise<Result<void>> {
  if (!SUPABASE_CONFIGURED) return { ok: true, data: undefined };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { ok: false, error: 'Not signed in', requiresLogin: true };

  if (input.source === 'notification') {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', input.id)
      .eq('user_id', userId)
      .is('read_at', null);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from('announcement_reads')
      .upsert(
        { announcement_id: input.id, user_id: userId },
        { onConflict: 'announcement_id,user_id' },
      );
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true, data: undefined };
}

// ============================================================
// Mark all as read
// ============================================================

export async function markAllAsRead(): Promise<Result<void>> {
  if (!SUPABASE_CONFIGURED) return { ok: true, data: undefined };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { ok: false, error: 'Not signed in', requiresLogin: true };

  const now = new Date().toISOString();

  // 1. Flag every unread personal notification.
  const { error: notifErr } = await supabase
    .from('notifications')
    .update({ read_at: now })
    .eq('user_id', userId)
    .is('read_at', null);
  if (notifErr) return { ok: false, error: notifErr.message };

  // 2. For announcements, fetch the ones the user hasn't acknowledged yet
  //    and bulk-upsert read rows. Cheaper than running a NOT EXISTS subquery
  //    through PostgREST.
  const [annRes, readsRes] = await Promise.all([
    supabase.from('announcements').select('id'),
    supabase.from('announcement_reads').select('announcement_id'),
  ]);
  if (annRes.error) return { ok: false, error: annRes.error.message };

  const read = new Set((readsRes.data ?? []).map((r) => r.announcement_id));
  const unread = (annRes.data ?? [])
    .map((a) => a.id)
    .filter((id) => !read.has(id));

  if (unread.length > 0) {
    const rows = unread.map((announcement_id) => ({
      announcement_id,
      user_id: userId,
      read_at: now,
    }));
    const { error: insErr } = await supabase
      .from('announcement_reads')
      .upsert(rows, { onConflict: 'announcement_id,user_id' });
    if (insErr) return { ok: false, error: insErr.message };
  }

  revalidatePath('/[locale]/notifications', 'page');
  return { ok: true, data: undefined };
}
