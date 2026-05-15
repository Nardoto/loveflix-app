-- ================================================================
-- AllureTV — Age Verification (Fase 0)
-- ================================================================
-- Self-contained: a migration 0001_init.sql nunca foi aplicada neste
-- projeto (o app usa o schema da 0005 em diante). Esta migration cria
-- public.profiles (que ainda não existe) com o trigger de auto-criação
-- no signup E faz backfill pra usuários já existentes em auth.users,
-- depois adiciona as colunas de age verification, RPC, audit log e
-- helper boolean.
--
-- NÃO mexe em books/ebook_pages porque essas tabelas não existem neste
-- banco — o catálogo opera direto sobre stories/story_audio. O gate de
-- "só assinante vê conteúdo pago" é feito no Worker (`worker-media/`)
-- via JWT, não em RLS de tabela.
--
-- Idempotente: usa `if not exists` em tabela/coluna, `or replace` em
-- função, `drop policy if exists` antes de recriar.
-- ================================================================

-- ----------------------------------------------------------------
-- public.profiles — extends auth.users
-- ----------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  preferred_language text default 'en' check (preferred_language in ('en','de','fr','es')),
  role text default 'user' check (role in ('user','admin')),
  created_at timestamptz default now()
);

-- Auto-create profile no signup (handle_new_user trigger)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: cria profiles pra todos auth.users existentes (idempotente
-- via on conflict). Necessário porque o app rodou meses sem profiles —
-- sem isso, usuários existentes não conseguiriam declarar idade.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- RLS em profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

grant select, update on public.profiles to authenticated;

-- ----------------------------------------------------------------
-- Age verification: colunas em profiles
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
-- Helper boolean: lib/age e middleware podem reusar
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
-- Audit table (LGPD/GDPR: IP/UA hasheados, não raw)
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

-- Service role escreve via server action. Admin lê via ADMIN_EMAILS no
-- código (não via profiles.role), então sem policy de SELECT — o
-- service-role bypassa RLS.
drop policy if exists "age_events_admin_select" on public.age_verification_events;

grant insert, select on public.age_verification_events to service_role;

-- ================================================================
-- Notas pro futuro
-- ================================================================
-- O endurecimento de RLS em tabelas de conteúdo (exigir age_verified
-- além de subscription) NÃO está incluído aqui porque o app não usa
-- public.books / public.ebook_pages. O gate de conteúdo pago é feito no
-- Cloudflare Worker (worker-media/) via JWT tier — o middleware do
-- Next.js (matcher em /watch e /read) é quem barra usuário sem
-- age_verified antes mesmo do request chegar no Worker.
-- ================================================================
