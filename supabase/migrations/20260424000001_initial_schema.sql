-- Faza A: podstawowy schemat bazy
-- Zasady: data minimization, timestamps wszędzie, FK do auth.users, brak duplikacji emaila.

-- ============================================================
-- ENUMS
-- ============================================================

create type public.plan_tier as enum ('free', 'pro');

create type public.subscription_status as enum (
  'trialing',   -- 7-dniowy trial
  'active',     -- opłacona, aktywna
  'past_due',   -- płatność nieudana, grace period
  'cancelled',  -- anulowana przez usera, aktywna do period_end
  'expired'     -- wygasła / po grace period
);

-- ============================================================
-- profiles  (1:1 z auth.users)
-- ============================================================

create table public.profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  plan          public.plan_tier not null default 'free',
  plan_until    timestamptz,               -- null dla free; data wygaśnięcia dla pro
  locale        text default 'pl',         -- preferowany język UI
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Profil użytkownika. Email trzymany w auth.users (nie duplikujemy).';
comment on column public.profiles.plan_until is 'Kiedy Pro kończy się. NULL dla Free.';

create index profiles_plan_idx on public.profiles (plan) where plan = 'pro';

-- ============================================================
-- saved_codes  (biblioteka kodów usera)
-- ============================================================

create table public.saved_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  code_type   text not null,                   -- 'EAN13' | 'CODE128' | 'QR' | ...
  value       text not null,                   -- zawartość kodu
  settings    jsonb not null default '{}'::jsonb,  -- kolor, rozmiar, margines itp.
  tags        text[] not null default '{}',
  name        text,                            -- etykieta usera (opcjonalna)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index saved_codes_user_created_idx on public.saved_codes (user_id, created_at desc);
create index saved_codes_tags_idx on public.saved_codes using gin (tags);

-- ============================================================
-- label_templates  (szablony etykiet Pro)
-- ============================================================

create table public.label_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  config      jsonb not null,                  -- layout, rozmiar strony, marginesy, czcionka
  logo_path   text,                            -- ścieżka w Storage bucket 'logos'
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index label_templates_user_idx on public.label_templates (user_id);
create unique index label_templates_one_default_per_user
  on public.label_templates (user_id) where is_default = true;

-- ============================================================
-- subscriptions  (LemonSqueezy)
-- ============================================================

create table public.subscriptions (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  ls_subscription_id  text unique,             -- ID z LemonSqueezy
  ls_customer_id      text,
  ls_variant_id       text,                    -- monthly / yearly
  status              public.subscription_status not null default 'trialing',
  trial_end           timestamptz,             -- koniec 7-dniowego trial
  current_period_end  timestamptz,             -- kiedy odnowienie / wygaśnięcie
  cancel_at           timestamptz,             -- ustawiane gdy user anuluje
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index subscriptions_status_idx on public.subscriptions (status);

-- ============================================================
-- usage_events  (lightweight audit + rate limiting)
-- ============================================================

create table public.usage_events (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_type  text not null,                   -- 'code_generated' | 'bulk_export' | 'template_used' ...
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index usage_events_user_created_idx on public.usage_events (user_id, created_at desc);
create index usage_events_type_created_idx on public.usage_events (event_type, created_at desc);

comment on table public.usage_events is 'Lightweight events; retencja: rotacja po 90 dniach (osobny job).';

-- ============================================================
-- updated_at trigger (generic)
-- ============================================================

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
