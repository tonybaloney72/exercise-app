-- A2: per-group emphasis scores (0–4) and custom-priority flag.

alter table public.user_settings
  add column if not exists training_priority_customized boolean not null default false,
  add column if not exists training_priority_scores jsonb;

comment on column public.user_settings.training_priority_scores is
  'Emphasis per group: core, cardio, lower, upper_push, upper_pull (0–4).';
