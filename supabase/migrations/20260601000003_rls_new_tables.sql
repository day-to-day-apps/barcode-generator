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
