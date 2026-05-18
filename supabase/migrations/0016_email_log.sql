-- ================================================================
-- AllureTV — Transactional email log + idempotency
-- ================================================================
-- One row per transactional email we attempt to send. The Stripe webhook
-- INSERTs first with ON CONFLICT DO NOTHING so duplicate webhook deliveries
-- (Stripe retries, idempotency replays) never double-send. The (user_id,
-- template, idempotency_key) uniqueness is the contract:
--
--   - welcome:        idempotency_key = stripe_subscription_id
--   - payment_failed: idempotency_key = stripe_invoice_id
--   - cancellation:   idempotency_key = stripe_subscription_id
--   - renewal:        idempotency_key = stripe_invoice_id
--
-- status starts at 'pending' on INSERT and flips to 'sent' (with resend_id)
-- once Resend confirms acceptance, or 'failed' (with error_message) if the
-- API call threw. A retry job can later requeue rows where status='failed'.
-- ================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'email_template') then
    create type email_template as enum (
      'welcome',
      'payment_failed',
      'cancellation',
      'renewal'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'email_status') then
    create type email_status as enum (
      'pending',
      'sent',
      'failed'
    );
  end if;
end $$;

create table if not exists public.email_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  template        email_template not null,
  idempotency_key text not null,
  to_address      text not null,
  locale          text not null,
  resend_id       text,
  status          email_status not null default 'pending',
  error_message   text,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  unique (user_id, template, idempotency_key)
);

create index if not exists idx_email_log_user_template
  on public.email_log(user_id, template);

create index if not exists idx_email_log_status_failed
  on public.email_log(status, created_at)
  where status = 'failed';

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
-- Service role only. Users don't read this directly — there's no UI for it.
-- The Stripe webhook writes using SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
alter table public.email_log enable row level security;

-- Drop any prior policy (in case we ever expose a read view to users).
drop policy if exists "email_log_no_access" on public.email_log;

-- No policies = no access for anon/authenticated roles. Service role bypasses.
