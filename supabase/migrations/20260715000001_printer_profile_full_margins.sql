alter table public.printer_profiles
  add column if not exists margin_right_mm numeric not null default 0 check (margin_right_mm >= 0 and margin_right_mm <= 200),
  add column if not exists margin_bottom_mm numeric not null default 0 check (margin_bottom_mm >= 0 and margin_bottom_mm <= 200);
