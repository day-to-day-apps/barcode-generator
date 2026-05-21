-- M4 — Public sharing kodów (ROADMAP §M4).
-- Dodaje kolumny is_public/share_slug do saved_codes, trigger generujący 12-znakowy
-- slug base62 oraz funkcję SECURITY DEFINER do publicznego odczytu po slugu.
-- Wzorzec dostępu: anon/authenticated → rpc.get_shared_code(p_slug), nigdy SELECT
-- na tabeli (RLS pozostaje owner-only).

-- =============================================================================
-- 1. Kolumny
-- =============================================================================
alter table public.saved_codes
  add column if not exists is_public boolean not null default false,
  add column if not exists share_slug text;

create unique index if not exists saved_codes_share_slug_uidx
  on public.saved_codes (share_slug)
  where share_slug is not null;

-- =============================================================================
-- 2. Generator slugów (12 znaków base62 ≈ 3.2e21 przestrzeni, kolizja pomijalna)
-- =============================================================================
create or replace function public.gen_share_slug()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i int;
begin
  for i in 1..12 loop
    result := result || substr(alphabet, 1 + floor(random() * 62)::int, 1);
  end loop;
  return result;
end;
$$;

revoke execute on function public.gen_share_slug() from public, anon, authenticated;

-- =============================================================================
-- 3. Trigger: nadaj slug gdy is_public=true i slug jest pusty.
--    Slug zostaje po wyłączeniu publicznego dostępu (re-enable nie zmienia URL).
-- =============================================================================
create or replace function public.saved_codes_assign_share_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt int := 0;
  candidate text;
begin
  if new.is_public = true and new.share_slug is null then
    loop
      attempt := attempt + 1;
      candidate := public.gen_share_slug();
      if not exists (select 1 from public.saved_codes where share_slug = candidate) then
        new.share_slug := candidate;
        exit;
      end if;
      if attempt > 5 then
        raise exception 'gen_share_slug: nie udało się wygenerować unikalnego sluga po 5 próbach';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

revoke execute on function public.saved_codes_assign_share_slug() from public, anon, authenticated;

drop trigger if exists saved_codes_share_slug_assign on public.saved_codes;
create trigger saved_codes_share_slug_assign
  before insert or update of is_public on public.saved_codes
  for each row execute function public.saved_codes_assign_share_slug();

-- =============================================================================
-- 4. RPC publicznego odczytu — jedyna ścieżka dla anon/authenticated do public codes.
--    Zwraca whitelist kolumn (BEZ user_id, tags, updated_at).
-- =============================================================================
create or replace function public.get_shared_code(p_slug text)
returns table (
  share_slug text,
  code_type text,
  value text,
  name text,
  settings jsonb,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select sc.share_slug, sc.code_type, sc.value, sc.name, sc.settings, sc.created_at
  from public.saved_codes sc
  where sc.is_public = true
    and sc.share_slug = p_slug
  limit 1;
$$;

revoke execute on function public.get_shared_code(text) from public;
grant execute on function public.get_shared_code(text) to anon, authenticated;

comment on function public.get_shared_code(text) is
  'Publiczny odczyt kodu po share_slug (whitelist kolumn, RLS bypassowane przez SECURITY DEFINER).';
