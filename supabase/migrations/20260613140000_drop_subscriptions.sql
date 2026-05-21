-- Drop dead subscriptions schema (LemonSqueezy plan was abandoned).
-- is_pro() is reset to constant false so callers (enforce_free_saved_codes_limit, RLS) keep working.
-- Pre-flight verified: zero application code references is_pro/subscriptions/subscription_status/plan_tier.

-- 1. Reset is_pro() to remove dependency on subscriptions table.
create or replace function public.is_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select false;
$$;

comment on function public.is_pro(uuid) is
  'Stub: Pro tier abandoned. Always returns false until billing is re-introduced.';

revoke execute on function public.is_pro(uuid) from public, anon, authenticated;

-- 2. Drop the table (CASCADE removes RLS policies, indexes, triggers, FKs).
drop table if exists public.subscriptions cascade;

-- 3. Drop the enum type now that no column references it.
drop type if exists public.subscription_status;
