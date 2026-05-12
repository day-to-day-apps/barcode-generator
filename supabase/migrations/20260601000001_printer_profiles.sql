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
