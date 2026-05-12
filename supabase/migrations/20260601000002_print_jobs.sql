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
