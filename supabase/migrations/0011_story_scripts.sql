-- ================================================================
-- AllureTV — Roteiros multilíngues (texto) + galeria de imagens
-- ================================================================
-- Em vez de subir PDFs, o admin grava o roteiro em markdown por idioma
-- e sobe N imagens ilustrativas (compartilhadas entre idiomas — a
-- imagem da cena é a mesma em qualquer língua). O site monta o reader
-- in-app substituindo marcadores `{{img N}}` pelas imagens.
--
-- Story_scripts segue o mesmo padrão de story_audio (0005_stories.sql):
-- (story_id, locale) é a PK; service_role escreve via admin actions;
-- leitura é pública porque o paywall do conteúdo é gateado em outro
-- ponto (page-level + Cloudflare Worker).
-- ================================================================

create table if not exists public.story_scripts (
  story_id text references public.stories(id) on delete cascade,
  locale text not null check (locale in ('en','de','fr','es')),
  content text not null default '',
  word_count int default 0,
  updated_at timestamptz default now(),
  primary key (story_id, locale)
);

create index if not exists idx_story_scripts_story
  on public.story_scripts(story_id);

-- updated_at auto-bump (reutilizando a função criada em 0005)
drop trigger if exists trg_story_scripts_touch on public.story_scripts;
create trigger trg_story_scripts_touch
  before update on public.story_scripts
  for each row execute function public.touch_updated_at();

-- ---------- RLS ----------------------------------------------------
alter table public.story_scripts enable row level security;

drop policy if exists "story_scripts_public_read" on public.story_scripts;
create policy "story_scripts_public_read"
  on public.story_scripts for select
  using (true);

grant select on public.story_scripts to anon, authenticated, service_role;
grant insert, update, delete on public.story_scripts to service_role;

-- ---------- Galeria de imagens contagem na stories ----------------
-- Admin sobe N imagens em stories/{slug}/book1/ebook/page-NNN.jpg
-- O reader precisa saber quantas pra resolver as URLs.
alter table public.stories
  add column if not exists ebook_image_count int default 0;
