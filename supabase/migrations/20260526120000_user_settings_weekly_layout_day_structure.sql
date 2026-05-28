-- Weekly layout: per-day round structure (blocks / repeat / mixed).

alter table public.user_settings
  add column if not exists weekly_layout_day_structure jsonb,
  add column if not exists weekly_layout_day_structure_customized boolean not null default false;
