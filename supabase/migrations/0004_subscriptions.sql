-- ================================================================
-- AllureTV — Stripe subscriptions
-- ================================================================
-- STANDALONE migration. Does NOT depend on 0001_init.sql.
-- Mirrors the subscription state from Stripe via the webhook handler at
-- app/api/stripe/webhook/route.ts.
--
-- One row per user. Updated by the service-role client when Stripe sends
-- checkout.session.completed / customer.subscription.* / invoice.* events.
-- ================================================================

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  status text not null
    check (status in (
      'active','canceled','past_due','trialing','incomplete',
      'incomplete_expired','unpaid','paused'
    )),
  price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  trial_end timestamptz,
  updated_at timestamptz default now()
);

create index if not exists idx_subscriptions_status
  on public.subscriptions(status);
create index if not exists idx_subscriptions_customer
  on public.subscriptions(stripe_customer_id);

-- Helper function: does this user have access right now?
-- Counts as "active" if status is active/trialing OR if it's canceled but the
-- paid period hasn't ended yet (the user paid, hasn't been refunded).
create or replace function public.user_has_access(uid uuid)
returns boolean
language sql
stable
as $$
  select coalesce(
    (
      select
        status in ('active','trialing')
        or (status = 'canceled' and current_period_end > now())
      from public.subscriptions
      where user_id = uid
      limit 1
    ),
    false
  );
$$;


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
alter table public.subscriptions enable row level security;

-- Users can SELECT their own row (so the /account page can show their plan).
-- All writes go through service_role from the Stripe webhook — no user-level
-- INSERT/UPDATE/DELETE policy is exposed.
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);
