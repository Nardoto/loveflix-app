-- ================================================================
-- AllureTV — Stories podem ter múltiplos gêneros (tags)
-- ================================================================
-- O campo `genre` único (text com CHECK) virou limitante: uma story
-- de Mafia também pode ser Forbidden, ou um Billionaire também ser
-- Second Chance. Migramos pra um array `genres text[]`.
--
-- Estratégia conservadora: mantemos `genre` por enquanto pra retro-
-- compat (read paths não migrados). Server actions passam a gravar
-- nos DOIS campos: genre[0] vira o singular, restantes ficam no array.
-- Removo o CHECK constraint do `genre` porque agora `genres` é a
-- fonte da verdade e a validação acontece no app.
--
-- Quando todo código estiver lendo só de `genres`, dropamos `genre`.
-- ================================================================

alter table public.stories
  add column if not exists genres text[] default '{}';

-- Backfill: pra toda story existente, genres = [genre]
update public.stories
set genres = array[genre]
where genre is not null and (genres is null or array_length(genres, 1) is null);

-- Drop o CHECK antigo de `genre` (gravado como constraint sem nome).
-- O CHECK era: genre in ('mafia','billionaire','forbidden',...,'mood').
-- Pra remover, descobrimos o nome dinamicamente.
do $$
declare cn text;
begin
  select conname into cn
  from pg_constraint
  where conrelid = 'public.stories'::regclass
    and pg_get_constraintdef(oid) like '%genre%IN%';
  if cn is not null then
    execute format('alter table public.stories drop constraint %I', cn);
  end if;
end $$;

-- Index pra queries do tipo "stories with genre X".
-- GIN é o índice certo pra arrays.
create index if not exists idx_stories_genres on public.stories using gin(genres);
