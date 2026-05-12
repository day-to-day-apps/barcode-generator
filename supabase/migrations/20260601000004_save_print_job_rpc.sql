-- Atomic RPC: insert print_jobs row + bulk insert print_job_items.
-- Returns the new job id. Both inserts happen in a single transaction.

create or replace function public.save_print_job(job_data jsonb, items jsonb[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id          uuid := auth.uid();
  v_job_id           uuid;
  v_template_id      uuid;
  v_printer_id       uuid;
  v_name             text;
  v_notes            text;
  v_item             jsonb;
  v_position         int;
  v_max_items        int := 500;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  v_name        := nullif(trim(job_data->>'name'), '');
  v_notes       := nullif(job_data->>'notes', '');
  v_template_id := nullif(job_data->>'template_id', '')::uuid;
  v_printer_id  := nullif(job_data->>'printer_profile_id', '')::uuid;

  if v_name is null then
    raise exception 'job_name_required' using errcode = '22023';
  end if;
  if array_length(items, 1) is null or array_length(items, 1) = 0 then
    raise exception 'job_items_required' using errcode = '22023';
  end if;
  if array_length(items, 1) > v_max_items then
    raise exception 'job_items_limit_exceeded' using errcode = '22023';
  end if;

  -- Verify template ownership (if provided)
  if v_template_id is not null then
    if not exists (
      select 1 from public.label_templates
      where id = v_template_id and user_id = v_user_id
    ) then
      raise exception 'template_not_found' using errcode = '42501';
    end if;
  end if;

  -- Verify printer profile ownership (if provided)
  if v_printer_id is not null then
    if not exists (
      select 1 from public.printer_profiles
      where id = v_printer_id and user_id = v_user_id
    ) then
      raise exception 'printer_not_found' using errcode = '42501';
    end if;
  end if;

  insert into public.print_jobs (user_id, name, template_id, printer_profile_id, notes)
  values (v_user_id, v_name, v_template_id, v_printer_id, v_notes)
  returning id into v_job_id;

  v_position := 0;
  foreach v_item in array items loop
    insert into public.print_job_items (
      job_id, position, code_type, value, name, price, description, copies, extra
    )
    values (
      v_job_id,
      v_position,
      coalesce(v_item->>'code_type', 'CODE128'),
      coalesce(v_item->>'value', ''),
      nullif(v_item->>'name', ''),
      nullif(v_item->>'price', ''),
      nullif(v_item->>'description', ''),
      coalesce((v_item->>'copies')::int, 1),
      coalesce(v_item->'extra', '{}'::jsonb)
    );
    v_position := v_position + 1;
  end loop;

  return v_job_id;
end;
$$;

revoke execute on function public.save_print_job(jsonb, jsonb[]) from public, anon;
grant  execute on function public.save_print_job(jsonb, jsonb[]) to authenticated;

comment on function public.save_print_job(jsonb, jsonb[]) is
  'Atomically creates a print_jobs row plus its print_job_items. Validates ownership of template/printer.';
