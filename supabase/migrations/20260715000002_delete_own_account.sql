create or replace function public.delete_own_account(confirmation text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted boolean;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if confirmation not in ('DELETE ACCOUNT', 'USUN KONTO') then
    raise exception 'confirmation_required' using errcode = '22023';
  end if;

  delete from auth.users where id = auth.uid();
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

revoke all on function public.delete_own_account(text) from public;
grant execute on function public.delete_own_account(text) to authenticated;
