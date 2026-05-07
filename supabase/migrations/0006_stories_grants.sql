-- ================================================================
-- AllureTV — Grants for the stories catalog tables
-- ================================================================
-- Run AFTER 0005_stories.sql in the Supabase SQL Editor.
--
-- Even though service_role has BYPASSRLS, table-level GRANTs still
-- apply — Supabase doesn't auto-grant to its named roles when a table
-- is created by the migration runner. Without this, the seed script
-- (and admin server actions, which use createServiceClient()) hit
-- "permission denied for table authors" / stories / story_audio.
--
-- Read access goes to anon + authenticated (the catalog is public).
-- Write access stays restricted to service_role (admin actions only).
-- ================================================================

grant select on public.authors      to anon, authenticated, service_role;
grant select on public.stories      to anon, authenticated, service_role;
grant select on public.story_audio  to anon, authenticated, service_role;

grant insert, update, delete on public.authors      to service_role;
grant insert, update, delete on public.stories      to service_role;
grant insert, update, delete on public.story_audio  to service_role;
