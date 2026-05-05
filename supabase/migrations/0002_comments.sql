-- ================================================================
-- AllureTV — Story comments, likes and replies
-- ================================================================
-- STANDALONE migration. Does NOT depend on 0001_init.sql.
-- Safe to run on a fresh Supabase project (only auth.users is required,
-- which Supabase provisions automatically).
--
-- Why a new "story_comments" table separate from "ratings"?
-- - ratings (in 0001_init, optional) is keyed by (user_id, story_id) — one per
--   user per story. That's the right shape for a star rating.
-- - story_comments is for free-form comments which can exist with or without a
--   rating, can repeat, can be replied to and liked.
--
-- The comment tables key on text story_slug (not FK to stories.id) because the
-- story catalog still lives in lib/data/stories.ts during the MVP. Once stories
-- are imported into the DB, we can add a FK / migrate to story_id.
-- ================================================================


-- ================================================================
-- COMMENT USER META — display_name + avatar_url for the comment renderer.
-- Kept as its own table (instead of altering public.profiles) so this
-- migration is standalone and works even when 0001_init.sql isn't run yet.
-- When profiles is later available, copy these values over.
-- ================================================================
create table if not exists public.comment_user_meta (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

alter table public.comment_user_meta enable row level security;

create policy "comment_user_meta_select_all"
  on public.comment_user_meta for select using (true);

create policy "comment_user_meta_upsert_own"
  on public.comment_user_meta for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "comment_user_meta_update_own"
  on public.comment_user_meta for update
  using (auth.uid() = user_id);


-- ================================================================
-- COMMENTS (top-level)
-- ================================================================
create table public.story_comments (
  id uuid primary key default gen_random_uuid(),
  story_slug text not null,
  user_id uuid not null references auth.users on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  stars int check (stars between 1 and 5),  -- nullable: free-form comments allowed
  created_at timestamptz default now()
);

create index idx_story_comments_slug_created
  on public.story_comments(story_slug, created_at desc);
create index idx_story_comments_user
  on public.story_comments(user_id);


-- ================================================================
-- LIKES (per comment, per user)
-- Composite PK prevents the same user liking twice.
-- ================================================================
create table public.story_comment_likes (
  comment_id uuid not null references public.story_comments on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz default now(),
  primary key (comment_id, user_id)
);

create index idx_story_comment_likes_comment
  on public.story_comment_likes(comment_id);


-- ================================================================
-- REPLIES (one level deep — no nested replies in the MVP)
-- ================================================================
create table public.story_comment_replies (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.story_comments on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz default now()
);

create index idx_story_comment_replies_parent
  on public.story_comment_replies(parent_id, created_at);


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
alter table public.story_comments enable row level security;
alter table public.story_comment_likes enable row level security;
alter table public.story_comment_replies enable row level security;


-- COMMENTS
create policy "story_comments_select_all"
  on public.story_comments for select using (true);

create policy "story_comments_insert_authenticated"
  on public.story_comments for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "story_comments_update_own"
  on public.story_comments for update
  using (auth.uid() = user_id);

create policy "story_comments_delete_own"
  on public.story_comments for delete
  using (auth.uid() = user_id);


-- LIKES
create policy "story_comment_likes_select_all"
  on public.story_comment_likes for select using (true);

create policy "story_comment_likes_insert_authenticated"
  on public.story_comment_likes for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "story_comment_likes_delete_own"
  on public.story_comment_likes for delete
  using (auth.uid() = user_id);


-- REPLIES
create policy "story_comment_replies_select_all"
  on public.story_comment_replies for select using (true);

create policy "story_comment_replies_insert_authenticated"
  on public.story_comment_replies for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "story_comment_replies_update_own"
  on public.story_comment_replies for update
  using (auth.uid() = user_id);

create policy "story_comment_replies_delete_own"
  on public.story_comment_replies for delete
  using (auth.uid() = user_id);


-- ================================================================
-- AGGREGATE VIEWS — keep client queries cheap.
-- ================================================================

-- Like count + reply count per comment.
create or replace view public.story_comments_with_counts as
select
  c.id,
  c.story_slug,
  c.user_id,
  c.body,
  c.stars,
  c.created_at,
  m.display_name,
  m.avatar_url,
  coalesce(l.likes_count, 0)     as likes_count,
  coalesce(r.replies_count, 0)   as replies_count
from public.story_comments c
left join public.comment_user_meta m on m.user_id = c.user_id
left join (
  select comment_id, count(*)::int as likes_count
  from public.story_comment_likes
  group by comment_id
) l on l.comment_id = c.id
left join (
  select parent_id, count(*)::int as replies_count
  from public.story_comment_replies
  group by parent_id
) r on r.parent_id = c.id;

-- Aggregate per story: avg rating + total comments
create or replace view public.story_rating_aggregate as
select
  story_slug,
  count(*)::int                           as comment_count,
  count(*) filter (where stars is not null)::int as rated_count,
  coalesce(avg(stars)::numeric(3,2), 0)   as avg_rating
from public.story_comments
group by story_slug;
