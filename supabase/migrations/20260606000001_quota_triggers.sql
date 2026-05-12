-- M3 Path A: server-side quota enforcement for free tier on the new M2.5 tables.
-- Pattern mirrors tg_enforce_saved_codes_limit (20260507000002).
-- Limits (free tier):
--   label_templates   : 5 per user
--   printer_profiles  : 5 per user
--   print_jobs        : 20 per user
-- AFTER INSERT trigger raises check_violation (23514) if the per-user count
-- exceeds the limit. Frontend code (db-templates.js / db-printers.js /
-- db-jobs.js) already surfaces these errors to the UI.

create or replace function public.enforce_user_row_limit(
  p_table  regclass,
  p_user   uuid,
  p_limit  int
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  execute format('select count(*) from %s where user_id = $1', p_table)
    into v_count
    using p_user;

  if v_count > p_limit then
    raise exception 'free_limit_reached'
      using errcode = '23514',
            hint    = format('limit=%s table=%s', p_limit, p_table::text);
  end if;
end;
$$;

revoke execute on function public.enforce_user_row_limit(regclass, uuid, int)
  from public, anon, authenticated;

-- label_templates: 5
create or replace function public.tg_enforce_label_templates_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_user_row_limit('public.label_templates'::regclass, NEW.user_id, 5);
  return NEW;
end;
$$;

revoke execute on function public.tg_enforce_label_templates_limit() from public, anon, authenticated;

drop trigger if exists trg_label_templates_enforce_limit on public.label_templates;
create trigger trg_label_templates_enforce_limit
  after insert on public.label_templates
  for each row execute function public.tg_enforce_label_templates_limit();

-- printer_profiles: 5
create or replace function public.tg_enforce_printer_profiles_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_user_row_limit('public.printer_profiles'::regclass, NEW.user_id, 5);
  return NEW;
end;
$$;

revoke execute on function public.tg_enforce_printer_profiles_limit() from public, anon, authenticated;

drop trigger if exists trg_printer_profiles_enforce_limit on public.printer_profiles;
create trigger trg_printer_profiles_enforce_limit
  after insert on public.printer_profiles
  for each row execute function public.tg_enforce_printer_profiles_limit();

-- print_jobs: 20
create or replace function public.tg_enforce_print_jobs_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_user_row_limit('public.print_jobs'::regclass, NEW.user_id, 20);
  return NEW;
end;
$$;

revoke execute on function public.tg_enforce_print_jobs_limit() from public, anon, authenticated;

drop trigger if exists trg_print_jobs_enforce_limit on public.print_jobs;
create trigger trg_print_jobs_enforce_limit
  after insert on public.print_jobs
  for each row execute function public.tg_enforce_print_jobs_limit();
