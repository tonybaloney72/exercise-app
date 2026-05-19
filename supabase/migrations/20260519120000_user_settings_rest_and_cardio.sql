-- Per-weekday rest + cardio preferences (Phase 1–2)

alter table public.user_settings
  add column if not exists weekly_rest_days jsonb not null default '{}',
  add column if not exists weekly_rest_days_customized boolean not null default false,
  add column if not exists weekly_cardio_by_day jsonb not null default '{}',
  add column if not exists weekly_cardio_customized boolean not null default false;
