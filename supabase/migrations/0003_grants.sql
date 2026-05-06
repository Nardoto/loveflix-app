-- ================================================================
-- AllureTV — Grants for views
-- ================================================================
-- Run AFTER 0002_comments.sql in the Supabase SQL Editor.
--
-- Postgres views inherit RLS from their underlying tables but do NOT
-- inherit grants automatically — Supabase's anon/authenticated/service_role
-- roles need explicit access. Without this, queries against
-- story_comments_with_counts and story_rating_aggregate fail with
-- "permission denied for view".
-- ================================================================

grant select on public.story_comments_with_counts
  to anon, authenticated, service_role;

grant select on public.story_rating_aggregate
  to anon, authenticated, service_role;
