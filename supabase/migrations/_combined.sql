-- ============================================================
-- POŁĄCZONE MIGRACJE F/M1 (idempotentne — można puścić raz)
-- Wklej całość do: Supabase Dashboard → SQL Editor → New query → Run.
-- Plik wygenerowany ze sklejenia:
--   20260424000001_initial_schema.sql
--   20260424000002_rls_policies.sql
--   20260424000003_functions_triggers.sql
-- ============================================================

-- ============================================================
-- 1/3  INITIAL SCHEMA
-- ============================================================

create type public.plan_tier as enum ('free', 'pro');

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'expired'
);

create table public.profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  plan          public.plan_tier not null default 'free',
  plan_until    timestamptz,
  locale        text default 'pl',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Profil użytkownika. Email trzymany w auth.users (nie duplikujemy).';
comment on column public.profiles.plan_until is 'Kiedy Pro kończy się. NULL dla Free.';

create index profiles_plan_idx on public.profiles (plan) where plan = 'pro';

create table public.saved_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  code_type   text not null,
  value       text not null,
  settings    jsonb not null default '{}'::jsonb,
  tags        text[] not null default '{}',
  name        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index saved_codes_user_created_idx on public.saved_codes (user_id, created_at desc);
create index saved_codes_tags_idx on public.saved_codes using gin (tags);

create table public.label_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  config      jsonb not null,
  logo_path   text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index label_templates_user_idx on public.label_templates (user_id);
create unique index label_templates_one_default_per_user
  on public.label_templates (user_id) where is_default = true;

create table public.subscriptions (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  ls_subscription_id  text unique,
  ls_customer_id      text,
  ls_variant_id       text,
  status              public.subscription_status not null default 'trialing',
  trial_end           timestamptz,
  current_period_end  timestamptz,
  cancel_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index subscriptions_status_idx on public.subscriptions (status);

create table public.usage_events (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_type  text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index usage_events_user_created_idx on public.usage_events (user_id, created_at desc);
create index usage_events_type_created_idx on public.usage_events (event_type, created_at desc);

comment on table public.usage_events is 'Lightweight events; retencja: rotacja po 90 dniach (osobny job).';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger saved_codes_set_updated_at
  before update on public.saved_codes
  for each row execute function public.set_updated_at();

create trigger label_templates_set_updated_at
  before update on public.label_templates
  for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2/3  RLS POLICIES
-- ============================================================

alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.saved_codes enable row level security;

create policy "saved_codes: select own"
  on public.saved_codes for select
  using (auth.uid() = user_id);

create policy "saved_codes: insert own"
  on public.saved_codes for insert
  with check (auth.uid() = user_id);

create policy "saved_codes: update own"
  on public.saved_codes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "saved_codes: delete own"
  on public.saved_codes for delete
  using (auth.uid() = user_id);

alter table public.label_templates enable row level security;

create policy "label_templates: select own"
  on public.label_templates for select
  using (auth.uid() = user_id);

create policy "label_templates: insert own"
  on public.label_templates for insert
  with check (auth.uid() = user_id);

create policy "label_templates: update own"
  on public.label_templates for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "label_templates: delete own"
  on public.label_templates for delete
  using (auth.uid() = user_id);

alter table public.subscriptions enable row level security;

create policy "subscriptions: select own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

alter table public.usage_events enable row level security;

create policy "usage_events: select own"
  on public.usage_events for select
  using (auth.uid() = user_id);

-- ============================================================
-- 3/3  FUNCTIONS & TRIGGERS
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, locale)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'locale', 'pl')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.status in ('trialing', 'active', 'past_due')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

comment on function public.is_pro(uuid) is
  'Zwraca true jeśli user ma aktywny trial/Pro/grace. Używane w UI i limitach.';

create or replace function public.enforce_free_saved_codes_limit(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_pro boolean;
  v_limit  int := 10;
begin
  select public.is_pro(p_user_id) into v_is_pro;
  if v_is_pro then
    return;
  end if;

  delete from public.saved_codes
  where id in (
    select id from public.saved_codes
    where user_id = p_user_id
    order by created_at desc
    offset v_limit
  );
end;
$$;

-- ============================================================
-- 4/4  REVOKE EXECUTE FROM PUBLIC ROLES (security advisor fix)
-- ============================================================

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_pro(uuid) from public, anon, authenticated;
revoke execute on function public.enforce_free_saved_codes_limit(uuid) from public, anon, authenticated;

-- ===== 20260507000002_enforce_limit_trigger.sql =====

-- Replace revoked-from-clients RPC with an AFTER INSERT trigger so the free-tier
-- 10-row cap is enforced server-side without granting EXECUTE on a SECURITY DEFINER
-- function to anon/authenticated roles.

create or replace function public.tg_enforce_saved_codes_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_free_saved_codes_limit(NEW.user_id);
  return NEW;
end;
$$;

revoke execute on function public.tg_enforce_saved_codes_limit() from public, anon, authenticated;

drop trigger if exists trg_saved_codes_enforce_limit on public.saved_codes;

create trigger trg_saved_codes_enforce_limit
  after insert on public.saved_codes
  for each row execute function public.tg_enforce_saved_codes_limit();

