-- ================================================================
-- AllureTV — stories catalog moved out of code into the DB
-- ================================================================
-- STANDALONE migration. Does NOT depend on 0001_init.sql.
--
-- Today the catalog (40 real + 45 placeholders) lives hardcoded in
-- lib/data/stories.ts + lib/data/placeholders.ts. The admin can't edit
-- those, and we need a real source of truth so:
--   • new stories uploaded via /admin/stories/new persist
--   • stories can be edited / soft-deleted from the dashboard
--   • the public catalog reads from a single place
--
-- The runtime keeps a graceful fallback: when this table is empty (e.g.
-- a fresh deploy that hasn't been seeded yet), lib/data/stories-server.ts
-- falls back to the hardcoded module so the home doesn't go blank.
-- ================================================================

-- ---------- Authors (channels) ---------------------------------------
create table if not exists public.authors (
  id text primary key,
  initial text not null,
  name text not null,
  tagline text not null,
  bio text not null,
  color text not null,                -- tailwind gradient classes
  avatar text not null,               -- /channels/foo.jpg
  youtube text,
  font_var text not null,             -- CSS variable name
  display_order int default 0,
  created_at timestamptz default now()
);

-- ---------- Stories --------------------------------------------------
create table if not exists public.stories (
  id text primary key,                -- '001'..'NNN' or 'fazendeiro' / 'magnata'
  slug text unique not null,
  title text not null,
  cover text not null,                -- public URL OR /covers/NNN.jpg
  cover_key text,                     -- R2 key when uploaded via admin
  genre text not null check (genre in (
    'mafia','billionaire','forbidden','secret_baby',
    'second_chance','arranged','royal','mood'
  )),
  tropes text[] default '{}',
  synopsis text not null,
  is_free boolean default false,
  is_premium boolean default false,
  is_hot boolean default false,
  is_coming_soon boolean default false,
  age_rating text default '18+',
  total_minutes int default 45,
  has_ebook boolean default false,
  -- Legacy fallback URLs (existing /media/*.mp4 + /media/*-audio-*.mp3).
  -- New uploads only set the *_key columns (R2-served via worker).
  video_src text,
  video_key text,
  -- Derived from genre but stored so admin can override.
  author_id text references public.authors(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- Per-locale audio tracks ----------------------------------
-- One story can have audio in multiple locales (en/de/fr/es). We store
-- BOTH the legacy URL (audio_src) and the R2 key (audio_key) for the
-- same reason as stories.video_*.
create table if not exists public.story_audio (
  story_id text references public.stories(id) on delete cascade,
  locale text not null check (locale in ('en','de','fr','es')),
  audio_src text,                     -- legacy /media/foo-audio-en.mp3
  audio_key text,                     -- R2 key for new uploads
  created_at timestamptz default now(),
  primary key (story_id, locale)
);

create index if not exists idx_stories_genre on public.stories(genre);
create index if not exists idx_stories_published on public.stories(published_at) where is_coming_soon = false;
create index if not exists idx_stories_hot on public.stories(is_hot) where is_hot = true;
create index if not exists idx_stories_author on public.stories(author_id);
create index if not exists idx_story_audio_locale on public.story_audio(locale);

-- ---------- updated_at auto-bump -------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists trg_stories_touch on public.stories;
create trigger trg_stories_touch
  before update on public.stories
  for each row execute function public.touch_updated_at();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
-- Catalog is public — any visitor can browse stories + see the channel
-- list. Writes always go through service_role (admin server actions).
alter table public.authors enable row level security;
alter table public.stories enable row level security;
alter table public.story_audio enable row level security;

drop policy if exists "authors_public_read" on public.authors;
create policy "authors_public_read"
  on public.authors for select
  using (true);

drop policy if exists "stories_public_read" on public.stories;
create policy "stories_public_read"
  on public.stories for select
  using (true);

drop policy if exists "story_audio_public_read" on public.story_audio;
create policy "story_audio_public_read"
  on public.story_audio for select
  using (true);
