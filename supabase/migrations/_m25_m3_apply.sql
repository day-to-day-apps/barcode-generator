-- ==================== 20260601000001_printer_profiles.sql ====================
-- Printer profiles: per-user printer calibration + base preset metadata.

create table if not exists public.printer_profiles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  name                  text not null check (char_length(name) between 1 and 80),
  base_preset_id        text,
  printer_type          text not null check (printer_type in ('thermal', 'a4-sheet', 'custom')),
  page_w_mm             numeric not null check (page_w_mm > 0 and page_w_mm <= 1000),
  page_h_mm             numeric not null check (page_h_mm > 0 and page_h_mm <= 1000),
  cols                  int not null default 1 check (cols between 1 and 50),
  rows                  int not null default 1 check (rows between 1 and 200),
  label_w_mm            numeric not null check (label_w_mm > 0 and label_w_mm <= 1000),
  label_h_mm            numeric not null check (label_h_mm > 0 and label_h_mm <= 1000),
  margin_top_mm         numeric not null default 0 check (margin_top_mm >= 0),
  margin_left_mm        numeric not null default 0 check (margin_left_mm >= 0),
  gap_x_mm              numeric not null default 0 check (gap_x_mm >= 0),
  gap_y_mm              numeric not null default 0 check (gap_y_mm >= 0),
  dpi                   int default 203 check (dpi between 72 and 1200),
  offset_x_mm           numeric default 0 check (offset_x_mm between -20 and 20),
  offset_y_mm           numeric default 0 check (offset_y_mm between -20 and 20),
  bar_width_correction  numeric default 1.0 check (bar_width_correction between 0.5 and 1.5),
  is_default            boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists printer_profiles_one_default
  on public.printer_profiles (user_id) where is_default;

create index if not exists printer_profiles_user
  on public.printer_profiles (user_id, created_at desc);

create trigger printer_profiles_set_updated_at
  before update on public.printer_profiles
  for each row execute function public.set_updated_at();

comment on table public.printer_profiles is
  'Per-user printer/sheet configurations. base_preset_id references a static preset in printer-presets.json.';


-- ==================== 20260601000002_print_jobs.sql ====================
-- Print jobs: saved multi-barcode print sheets.

create table if not exists public.print_jobs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null check (char_length(name) between 1 and 120),
  template_id         uuid references public.label_templates(id) on delete set null,
  printer_profile_id  uuid references public.printer_profiles(id) on delete set null,
  notes               text check (notes is null or char_length(notes) <= 2000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists print_jobs_user_created
  on public.print_jobs (user_id, created_at desc);

create trigger print_jobs_set_updated_at
  before update on public.print_jobs
  for each row execute function public.set_updated_at();

create table if not exists public.print_job_items (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.print_jobs(id) on delete cascade,
  position    int not null check (position >= 0),
  code_type   text not null check (char_length(code_type) between 1 and 32),
  value       text not null check (char_length(value) between 1 and 4096),
  name        text check (name is null or char_length(name) <= 200),
  price       text check (price is null or char_length(price) <= 64),
  description text check (description is null or char_length(description) <= 500),
  copies      int not null default 1 check (copies between 1 and 1000),
  extra       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists print_job_items_job_pos
  on public.print_job_items (job_id, position);

comment on table public.print_jobs is
  'A composed print sheet: references a label template, a printer profile, and an ordered list of items.';
comment on table public.print_job_items is
  'Individual barcode entries within a print job. Cascade-deleted with the parent job.';


-- ==================== 20260601000003_rls_new_tables.sql ====================
-- RLS for printer_profiles, print_jobs, print_job_items.
-- Same pattern as initial RLS: select/insert/update/delete restricted to owner.

alter table public.printer_profiles enable row level security;
alter table public.print_jobs       enable row level security;
alter table public.print_job_items  enable row level security;

-- printer_profiles
create policy printer_profiles_select on public.printer_profiles
  for select using (auth.uid() = user_id);
create policy printer_profiles_insert on public.printer_profiles
  for insert with check (auth.uid() = user_id);
create policy printer_profiles_update on public.printer_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy printer_profiles_delete on public.printer_profiles
  for delete using (auth.uid() = user_id);

-- print_jobs
create policy print_jobs_select on public.print_jobs
  for select using (auth.uid() = user_id);
create policy print_jobs_insert on public.print_jobs
  for insert with check (auth.uid() = user_id);
create policy print_jobs_update on public.print_jobs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy print_jobs_delete on public.print_jobs
  for delete using (auth.uid() = user_id);

-- print_job_items: ownership via parent job
create policy print_job_items_select on public.print_job_items
  for select using (
    exists (
      select 1 from public.print_jobs j
      where j.id = print_job_items.job_id and j.user_id = auth.uid()
    )
  );
create policy print_job_items_insert on public.print_job_items
  for insert with check (
    exists (
      select 1 from public.print_jobs j
      where j.id = print_job_items.job_id and j.user_id = auth.uid()
    )
  );
create policy print_job_items_update on public.print_job_items
  for update using (
    exists (
      select 1 from public.print_jobs j
      where j.id = print_job_items.job_id and j.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.print_jobs j
      where j.id = print_job_items.job_id and j.user_id = auth.uid()
    )
  );
create policy print_job_items_delete on public.print_job_items
  for delete using (
    exists (
      select 1 from public.print_jobs j
      where j.id = print_job_items.job_id and j.user_id = auth.uid()
    )
  );


-- ==================== 20260601000004_save_print_job_rpc.sql ====================
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


-- ==================== 20260606000001_quota_triggers.sql ====================
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


