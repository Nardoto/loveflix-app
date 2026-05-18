-- ================================================================
-- AllureTV — Replies oficiais da plataforma ("AllureTV Team")
-- ================================================================
-- Quando o admin responde um comentário pela área /admin/comments, a
-- resposta carrega uma flag is_creator_reply=true. O frontend usa essa
-- flag pra renderizar a reply com nome "AllureTV Team" + avatar do
-- logo + badge dourado "OFICIAL", em vez do display_name/avatar do
-- admin individual.
--
-- Decisão de design: NÃO criamos uma conta dummy "creator@alluretv".
-- A resposta continua atrelada ao user_id real do admin que respondeu
-- (rastreabilidade — sabemos quem foi). Apenas o RENDER muda quando a
-- flag está ligada.
--
-- service_role escreve a flag (admin actions usam createServiceClient).
-- Os reads continuam públicos (story_comment_replies_select_all do
-- 0002_comments.sql).
-- ================================================================

alter table public.story_comment_replies
  add column if not exists is_creator_reply boolean not null default false;

-- Index parcial — só faz sentido buscar por replies oficiais (raras vs.
-- replies normais que serão a maioria).
create index if not exists idx_story_comment_replies_creator
  on public.story_comment_replies(parent_id, created_at)
  where is_creator_reply = true;

-- View nova: replies enriquecidas com a meta do autor + a flag.
-- Usada pelo lib/data/comments-server.ts pra montar a árvore de
-- comments+replies numa só query lateral (Promise.all com a query
-- dos comments). Aliás, o display_name e avatar_url já vêm prontos
-- — quando is_creator_reply=true, o frontend ignora esses e usa
-- AllureTV Team + /logo/mark.jpg.
create or replace view public.story_comment_replies_with_meta as
select
  r.id,
  r.parent_id,
  r.user_id,
  r.body,
  r.created_at,
  r.is_creator_reply,
  m.display_name,
  m.avatar_url
from public.story_comment_replies r
left join public.comment_user_meta m on m.user_id = r.user_id;

grant select on public.story_comment_replies_with_meta
  to anon, authenticated, service_role;
