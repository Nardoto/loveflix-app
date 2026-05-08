-- ================================================================
-- AllureTV — Minha Lista (favoritos do usuário)
-- ================================================================
-- A tabela `favorites` foi criada em 0001_init.sql com
-- `story_id uuid references stories(id)`. Mas em 0005_stories.sql
-- a coluna stories.id é TEXT — então a FK estava quebrada e
-- nenhum insert ia funcionar.
--
-- DROP + CREATE: a tabela nunca recebeu dados reais (não há server
-- action de favoritos), então não tem o que migrar. Sem perda.
-- ================================================================

drop table if exists public.favorites cascade;

create table public.favorites (
  user_id uuid references auth.users on delete cascade,
  story_id text references public.stories(id) on delete cascade,
  added_at timestamptz default now(),
  primary key (user_id, story_id)
);

alter table public.favorites enable row level security;

drop policy if exists "favorites_all_own" on public.favorites;
create policy "favorites_all_own"
  on public.favorites for all
  using (auth.uid() = user_id);

-- Service role bypassa RLS, mas grants em si precisam existir.
grant select, insert, delete on public.favorites to authenticated, service_role;

create index if not exists idx_favorites_user
  on public.favorites(user_id, added_at desc);
