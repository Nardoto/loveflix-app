-- ================================================================
-- AllureTV — Grants for the comments tables
-- ================================================================
-- Run AFTER 0002_comments.sql in the Supabase SQL Editor.
--
-- 0002 enabled RLS and added the right "select_all / insert_authenticated /
-- update_own / delete_own" policies, BUT never granted table-level INSERT /
-- UPDATE / DELETE to the `authenticated` role. In Postgres, RLS is checked
-- AFTER the GRANT — without the GRANT the planner short-circuits with
-- "permission denied for table story_comments" before the policy ever runs.
--
-- That's why posting a review/comment from the site failed silently with
-- a 4xx, even though the user was logged in and the policy would have let
-- them through.
--
-- Reads are public (the catalog and reviews are not behind a paywall) so we
-- also grant SELECT to anon.
-- ================================================================

grant select                          on public.comment_user_meta      to anon, authenticated, service_role;
grant insert, update                  on public.comment_user_meta      to authenticated;

grant select                          on public.story_comments         to anon, authenticated, service_role;
grant insert, update, delete          on public.story_comments         to authenticated;

grant select                          on public.story_comment_likes    to anon, authenticated, service_role;
grant insert, delete                  on public.story_comment_likes    to authenticated;

grant select                          on public.story_comment_replies  to anon, authenticated, service_role;
grant insert, update, delete          on public.story_comment_replies  to authenticated;
