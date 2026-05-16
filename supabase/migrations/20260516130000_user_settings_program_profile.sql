-- Slice 5: program focus + round density for week materialization.

alter table public.user_settings
  add column if not exists program_focus text not null default 'balanced',
  add column if not exists round_density text not null default 'standard';

alter table public.user_settings
  drop constraint if exists user_settings_program_focus_check;

alter table public.user_settings
  add constraint user_settings_program_focus_check
  check (program_focus in ('balanced', 'minimal_core', 'strength', 'conditioning'));

alter table public.user_settings
  drop constraint if exists user_settings_round_density_check;

alter table public.user_settings
  add constraint user_settings_round_density_check
  check (round_density in ('compact', 'standard', 'full'));
