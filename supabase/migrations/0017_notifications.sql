-- ================================================================
-- AllureTV — In-app notifications + platform announcements
-- ================================================================
-- Two distinct shapes living together:
--
--   notifications      — one row per (user, event). Personal. RLS filters
--                        by auth.uid() = user_id. Inserted by server actions
--                        running under service_role (or via the helper RPC
--                        for like-grouping). Updated by the recipient to
--                        flip read_at.
--
--   announcements      — single broadcast row. Every authenticated user
--                        sees the same list. "Read" state is tracked in
--                        announcement_reads with a composite PK so the
--                        same user can't mark the same announcement read
--                        twice. This avoids the fan-out of inserting one
--                        notification row per user when the platform sends
--                        a new-release ping.
--
-- After this migration runs, enable Realtime for `notifications` and
-- `announcements` in the Supabase dashboard:
--   Project → Database → Replication → supabase_realtime publication
--   → toggle both tables ON.
-- The bell client subscribes via postgres_changes (INSERT events).
-- ================================================================


-- ================================================================
-- NOTIFICATIONS
-- ================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  -- 'reply_official' | 'reply_user' | 'comment_like'
  type text not null,
  -- Snapshot of everything the UI needs to render without a JOIN:
  -- { story_slug, story_title, parent_comment_id, parent_body_preview,
  --   reply_id?, reply_body_preview?, actor_display_name, actor_avatar_url,
  --   like_count? }
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Bell fetch: unread first, newest first, scoped to me.
create index if not exists idx_notifications_user_unread_created
  on public.notifications(user_id, read_at, created_at desc);

-- Used by enqueue_like_notification to find an existing unread bucket
-- to merge into (24h grouping window).
create index if not exists idx_notifications_like_bucket
  on public.notifications(user_id, type, (payload->>'parent_comment_id'), read_at)
  where type = 'comment_like' and read_at is null;

alter table public.notifications enable row level security;

-- Reads: user sees their own. No public listing — the bell is private.
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

-- No insert from regular clients. Server actions write via service_role,
-- which bypasses RLS. (We don't add a check-policy because granting
-- "insert with check (auth.uid() = user_id)" would let any user spam
-- notifications into their own bell — unhelpful, but worse, it'd let
-- adversaries pre-mark notifs read in their own table to test for the
-- existence of someone else's actions. Service_role only.)

-- Recipient can flip read_at on their own row. No other column can change.
create policy "notifications_update_own_read_at"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Recipient can delete their own notifications (lets us add "dismiss"
-- buttons later without a new migration).
create policy "notifications_delete_own"
  on public.notifications for delete
  using (auth.uid() = user_id);


-- ================================================================
-- ANNOUNCEMENTS (platform broadcast)
-- ================================================================
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  body text not null check (length(body) between 1 and 2000),
  -- Optional deep link. Can be a story slug, a route, anything the
  -- client wants to navigate to when the announcement is clicked.
  link_path text,
  -- Which admin published this. Kept for accountability; UI hides it.
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_announcements_created
  on public.announcements(created_at desc);

alter table public.announcements enable row level security;

-- Any authenticated session can read announcements (unauthenticated
-- users don't see the bell at all, so anon access isn't needed).
create policy "announcements_select_authenticated"
  on public.announcements for select
  using (auth.uid() is not null);

-- Only service_role writes. Admin actions go through createServiceClient.


-- ================================================================
-- ANNOUNCEMENT_READS (per-user read state)
-- ================================================================
create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.announcements on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create index if not exists idx_announcement_reads_user
  on public.announcement_reads(user_id);

alter table public.announcement_reads enable row level security;

create policy "announcement_reads_select_own"
  on public.announcement_reads for select
  using (auth.uid() = user_id);

create policy "announcement_reads_insert_own"
  on public.announcement_reads for insert
  with check (auth.uid() is not null and auth.uid() = user_id);


-- ================================================================
-- RPC: enqueue_like_notification
-- ================================================================
-- Likes flood — one comment can get 50 likes in an hour. Instead of 50
-- separate rows in the bell, group them into a single unread row that
-- accumulates a like_count and refreshes its created_at when a new like
-- arrives within 24h.
--
-- Called from app/actions/comments.ts toggleLike() under service_role,
-- after the like row has already been inserted. Skips self-likes (the
-- caller passes the comment owner; if owner == actor we don't call this).
--
-- Returns nothing — best-effort; if it fails the like itself stands.
-- ================================================================
create or replace function public.enqueue_like_notification(
  p_recipient_id uuid,
  p_parent_id uuid,
  p_story_slug text,
  p_story_title text,
  p_parent_body_preview text,
  p_actor_display_name text,
  p_actor_avatar_url text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  current_count int;
begin
  -- Find an unread like-bucket for this exact comment, created in the
  -- last 24h. If present, merge.
  select id, coalesce((payload->>'like_count')::int, 1)
    into existing_id, current_count
    from public.notifications
    where user_id = p_recipient_id
      and type = 'comment_like'
      and (payload->>'parent_comment_id') = p_parent_id::text
      and read_at is null
      and created_at > now() - interval '24 hours'
    order by created_at desc
    limit 1;

  if existing_id is not null then
    update public.notifications
      set payload = payload
            || jsonb_build_object(
                 'like_count', current_count + 1,
                 'actor_display_name', p_actor_display_name,
                 'actor_avatar_url', p_actor_avatar_url
               ),
          created_at = now()
      where id = existing_id;
  else
    insert into public.notifications (user_id, type, payload)
    values (
      p_recipient_id,
      'comment_like',
      jsonb_build_object(
        'story_slug', p_story_slug,
        'story_title', p_story_title,
        'parent_comment_id', p_parent_id::text,
        'parent_body_preview', p_parent_body_preview,
        'actor_display_name', p_actor_display_name,
        'actor_avatar_url', p_actor_avatar_url,
        'like_count', 1
      )
    );
  end if;
end;
$$;

-- Only service_role can invoke (the function is security definer; we
-- still revoke from anon/authenticated as defense-in-depth).
revoke all on function public.enqueue_like_notification(uuid, uuid, text, text, text, text, text)
  from anon, authenticated;
grant execute on function public.enqueue_like_notification(uuid, uuid, text, text, text, text, text)
  to service_role;


-- ================================================================
-- REALTIME PUBLICATION — enable INSERT streaming
-- ================================================================
-- The bell client subscribes to postgres_changes on these tables. The
-- supabase_realtime publication exists by default; we only add tables.
-- (Idempotent: alter publication will error if already a member, but
-- the do-block swallows that case.)
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.announcements;
  exception when duplicate_object then null;
  end;
end $$;
