alter table public.user_settings
  add column if not exists weekly_ppl_schedule jsonb,
  add column if not exists weekly_ppl_schedule_customized boolean not null default false;
