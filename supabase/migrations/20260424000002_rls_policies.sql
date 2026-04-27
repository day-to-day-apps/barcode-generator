-- Faza A: Row Level Security
-- Model: każdy user widzi tylko swoje wiersze. Dopasowanie przez auth.uid() = user_id.
-- subscriptions: read-only dla usera, write tylko service_role (Edge Function webhook).

-- ============================================================
-- profiles
-- ============================================================
alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- INSERT robi trigger on_auth_user_created (security definer), nie user bezpośrednio.
-- DELETE kaskadą z auth.users przy usuwaniu konta.

-- ============================================================
-- saved_codes
-- ============================================================
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

-- ============================================================
-- label_templates
-- ============================================================
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

-- ============================================================
-- subscriptions  (tylko read dla usera; write tylko service_role)
-- ============================================================
alter table public.subscriptions enable row level security;

create policy "subscriptions: select own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Brak policy INSERT/UPDATE/DELETE = domyślnie deny dla anon/authenticated.
-- service_role bypasuje RLS i jest używany tylko z Edge Function webhooka LS.

-- ============================================================
-- usage_events  (user widzi swoje, write tylko service_role lub RPC)
-- ============================================================
alter table public.usage_events enable row level security;

create policy "usage_events: select own"
  on public.usage_events for select
  using (auth.uid() = user_id);

-- Brak INSERT policy — eventy wchodzą przez dedykowaną funkcję RPC
-- (Faza E), która sprawdza rate-limit zanim wstawi.
