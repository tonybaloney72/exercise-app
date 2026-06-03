-- Body weight log (local calendar day → pounds).

alter table public.user_settings
  add column if not exists weight_log jsonb not null default '[]'::jsonb;

comment on column public.user_settings.weight_log is
  'Array of { date: YYYY-MM-DD, weightLb: number } body weight entries.';
