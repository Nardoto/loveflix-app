-- ================================================================
-- LOVEFLIX — Initial schema
-- ================================================================
-- Run this in Supabase SQL Editor: https://app.supabase.com -> SQL Editor

-- ================================================================
-- PROFILES (extends auth.users)
-- ================================================================
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  preferred_language text default 'en' check (preferred_language in ('en','de','fr','es')),
  role text default 'user' check (role in ('user','admin')),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ================================================================
-- STORIES
-- ================================================================
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title jsonb not null,                 -- {en,de,fr,es}
  description jsonb,
  cover_url text,                       -- 16:9 card cover
  hero_url text,                        -- wide hero image
  genre text not null check (genre in (
    'billionaire','mafia','second_chance','forbidden','secret_baby','arranged','royal','cowboy'
  )),
  is_hot boolean default false,
  is_free boolean default false,        -- imported from YouTube — open to all
  status text default 'draft' check (status in ('draft','coming_soon','published')),
  age_rating text default '18+',
  total_minutes int,
  created_at timestamptz default now(),
  published_at timestamptz
);

create index idx_stories_status on public.stories(status);
create index idx_stories_genre on public.stories(genre);
create index idx_stories_is_hot on public.stories(is_hot) where is_hot = true;

-- ================================================================
-- BOOKS (chapters of a story)
-- ================================================================
create table public.books (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories on delete cascade,
  number int not null,
  title jsonb,
  description jsonb,
  thumb_url text,
  bunny_video_id text,                  -- Bunny Stream video GUID
  audio_urls jsonb,                     -- {en,de,fr,es: "url"}
  duration_seconds int,
  is_free boolean default false,
  unique (story_id, number)
);

create index idx_books_story_id on public.books(story_id);

-- ================================================================
-- EBOOK PAGES
-- ================================================================
create table public.ebook_pages (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories on delete cascade,
  number int not null,
  chapter jsonb,
  title jsonb,
  body jsonb,                           -- HTML by language
  image_url text,
  unique (story_id, number)
);

create index idx_ebook_pages_story_id on public.ebook_pages(story_id);

-- ================================================================
-- SUBSCRIPTIONS (synced from Stripe webhook)
-- ================================================================
create table public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  status text not null,                 -- active|canceled|past_due|trialing|incomplete|unpaid
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  updated_at timestamptz default now()
);

create index idx_subscriptions_status on public.subscriptions(status);

-- Helper function: does user have active access?
create or replace function public.user_has_access(uid uuid)
returns boolean language sql stable as $$
  select coalesce(
    (select status = 'active' or (status = 'canceled' and current_period_end > now())
     from public.subscriptions where user_id = uid),
    false
  );
$$;

-- ================================================================
-- FAVORITES
-- ================================================================
create table public.favorites (
  user_id uuid references auth.users on delete cascade,
  story_id uuid references public.stories on delete cascade,
  added_at timestamptz default now(),
  primary key (user_id, story_id)
);

-- ================================================================
-- WATCH PROGRESS
-- ================================================================
create table public.watch_progress (
  user_id uuid references auth.users on delete cascade,
  book_id uuid references public.books on delete cascade,
  position_seconds int default 0,
  completed boolean default false,
  last_watched_at timestamptz default now(),
  primary key (user_id, book_id)
);

create index idx_watch_progress_user_id on public.watch_progress(user_id, last_watched_at desc);

-- ================================================================
-- RATINGS
-- ================================================================
create table public.ratings (
  user_id uuid references auth.users on delete cascade,
  story_id uuid references public.stories on delete cascade,
  stars int check (stars between 1 and 5),
  review text,
  created_at timestamptz default now(),
  primary key (user_id, story_id)
);

create index idx_ratings_story_id on public.ratings(story_id);

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.books enable row level security;
alter table public.ebook_pages enable row level security;
alter table public.subscriptions enable row level security;
alter table public.favorites enable row level security;
alter table public.watch_progress enable row level security;
alter table public.ratings enable row level security;

-- PROFILES: users see/edit own profile; admins see all
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id or exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- STORIES: published visible to all; admins write
create policy "stories_select_published" on public.stories
  for select using (status = 'published' or status = 'coming_soon' or exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "stories_admin_all" on public.stories
  for all using (exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- BOOKS: visible if free OR user has active subscription
create policy "books_select" on public.books
  for select using (
    is_free = true
    or exists(select 1 from public.stories where id = story_id and is_free = true)
    or public.user_has_access(auth.uid())
    or exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "books_admin_all" on public.books
  for all using (exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- EBOOK_PAGES: same rules as books
create policy "ebook_pages_select" on public.ebook_pages
  for select using (
    exists(select 1 from public.stories where id = story_id and is_free = true)
    or public.user_has_access(auth.uid())
    or exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "ebook_pages_admin_all" on public.ebook_pages
  for all using (exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- SUBSCRIPTIONS: user sees own only (Stripe webhook uses service_role to write)
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- FAVORITES: user reads/writes own only
create policy "favorites_all_own" on public.favorites
  for all using (auth.uid() = user_id);

-- WATCH_PROGRESS: user reads/writes own only
create policy "watch_progress_all_own" on public.watch_progress
  for all using (auth.uid() = user_id);

-- RATINGS: user writes own; everyone reads
create policy "ratings_select_all" on public.ratings
  for select using (true);
create policy "ratings_write_own" on public.ratings
  for all using (auth.uid() = user_id);

-- ================================================================
-- STORAGE BUCKETS (run separately in Supabase Dashboard or via API)
-- ================================================================
-- 1. Bucket "covers" (public) — story cover images, hero images
-- 2. Bucket "ebook-images" (public) — ebook page images
-- 3. Bucket "audios" (public OR signed) — language audio files
-- ================================================================
