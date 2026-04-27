-- Faza A: triggery i funkcje pomocnicze

-- ============================================================
-- Auto-utworzenie profilu przy rejestracji
-- ============================================================
-- Uruchamia się po kazdym INSERT do auth.users (signup Google / magic link).
-- SECURITY DEFINER, bo zwykły user nie może INSERTować do public.profiles bezposrednio.

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

-- ============================================================
-- Helper: czy user jest Pro (honoruje trial + grace period)
-- ============================================================
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

-- ============================================================
-- Retencja: saved_codes dla Free > 10 wierszy
-- ============================================================
-- Free user: limit 10 zapisanych kodów. Przy 11. insercie kasujemy najstarszy.
-- Wywoływane przez aplikację po udanym INSERT (prostsze niż trigger BEFORE INSERT).

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
