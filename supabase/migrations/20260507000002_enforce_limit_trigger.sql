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
