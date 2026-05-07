-- ================================================================
-- AllureTV — Grants for the subscriptions table
-- ================================================================
-- Run AFTER 0004_subscriptions.sql in the Supabase SQL Editor.
--
-- The Stripe webhook (app/api/stripe/webhook/route.ts) uses
-- createServiceClient() to upsert subscription state. Even though
-- service_role has BYPASSRLS, table-level GRANTs still apply — Supabase
-- doesn't auto-grant to its named roles when a table is created by the
-- migration runner. Without this, the webhook silently fails with
-- "permission denied for table subscriptions" and the admin keeps
-- showing 0 subscribers even after a real Stripe checkout completes.
--
-- The signed-in user reads their own row through the RLS policy
-- "subscriptions_select_own" defined in 0004 — that requires SELECT
-- granted to `authenticated`. anon has no access (not a public table).
-- ================================================================

grant select                          on public.subscriptions  to authenticated, service_role;
grant insert, update, delete          on public.subscriptions  to service_role;
