-- ================================================================
-- AllureTV — Age Verification (Fase 0)
-- ================================================================
-- Adiciona colunas de DOB / age_verified em profiles, função RPC pra
-- self-declaration (validada server-side, >= 18), tabela de audit, e
-- endurece RLS de books/ebook_pages pra exigir age_verified além de
-- subscription. Compatível com qualquer caminho futuro (Yoti, Segpay,
-- etc) — esta migration só implementa o subset comum.
--
-- Idempotente: usa `if not exists` em coluna, `or replace` em função,
-- `drop policy if exists` antes de recriar.
-- ================================================================

-- ----------------------------------------------------------------
-- Colunas em profiles
-- ----------------------------------------------------------------
alter table public.profiles
  add column if not exists date_of_birth date,
  add column if not exists age_verified_at timestamptz,
  add column if not exists verification_method text check (verification_method in
    ('self_declaration','credit_card','id_check','face_estimation')),
  add column if not exists id_verified boolean default false,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists age_verified_country text,
  add column if not exists age_verified_expires_at timestamptz;

create index if not exists idx_profiles_age_verified
  on public.profiles(age_verified_at)
  where age_verified_at is not null;

-- ----------------------------------------------------------------
-- RPC: verify_age_self (chamada pela página /verify-age)
-- security definer porque atualiza profiles via auth.uid()
-- ----------------------------------------------------------------
create or replace function public.verify_age_self(
  p_dob date,
  p_method text,
  p_terms_version text,
  p_country text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_dob is null or p_dob > (current_date - interval '18 years')::date then
    raise exception 'AGE_BELOW_18';
  end if;

  if p_method is null or p_method not in
     ('self_declaration','credit_card','id_check','face_estimation') then
    raise exception 'INVALID_METHOD';
  end if;

  update public.profiles
    set date_of_birth        = p_dob,
        age_verified_at      = now(),
        verification_method  = p_method,
        terms_accepted_at    = now(),
        terms_version        = p_terms_version,
        age_verified_country = p_country,
        age_verified_expires_at = now() + interval '2 years'
  where id = auth.uid();
end; $$;

grant execute on function public.verify_age_self(date, text, text, text)
  to authenticated;

-- ----------------------------------------------------------------
-- Helper boolean (reusado em RLS)
-- ----------------------------------------------------------------
create or replace function public.user_is_age_verified(uid uuid)
returns boolean language sql stable as $$
  select coalesce(
    (select age_verified_at is not null
       and (age_verified_expires_at is null or age_verified_expires_at > now())
     from public.profiles where id = uid),
    false
  );
$$;

-- ----------------------------------------------------------------
-- Audit table (LGPD/GDPR: IP hashed, não raw)
-- ----------------------------------------------------------------
create table if not exists public.age_verification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  method text not null,
  result text not null check (result in ('pass','fail','pending','expired')),
  ip_hash text,
  country_code text,
  user_agent_hash text,
  provider text,
  provider_ref text,
  created_at timestamptz default now()
);

create index if not exists idx_age_events_user
  on public.age_verification_events(user_id, created_at desc);

alter table public.age_verification_events enable row level security;

-- Só admin lê. Service role escreve via webhook/action.
drop policy if exists "age_events_admin_select" on public.age_verification_events;
create policy "age_events_admin_select" on public.age_verification_events
  for select using (
    exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

grant select on public.age_verification_events to authenticated;
grant insert, select on public.age_verification_events to service_role;

-- ----------------------------------------------------------------
-- Endurece RLS: books e ebook_pages agora exigem age_verified
-- (além de free/subscription). Admin continua tendo acesso total.
-- ----------------------------------------------------------------
drop policy if exists "books_select" on public.books;
create policy "books_select" on public.books
  for select using (
    is_free = true
    or exists(select 1 from public.stories where id = story_id and is_free = true)
    or (
      public.user_has_access(auth.uid())
      and public.user_is_age_verified(auth.uid())
    )
    or exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "ebook_pages_select" on public.ebook_pages;
create policy "ebook_pages_select" on public.ebook_pages
  for select using (
    exists(select 1 from public.stories where id = story_id and is_free = true)
    or (
      public.user_has_access(auth.uid())
      and public.user_is_age_verified(auth.uid())
    )
    or exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
