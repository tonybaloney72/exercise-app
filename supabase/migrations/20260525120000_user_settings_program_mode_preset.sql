-- Phase 5: rename program_mode value priorities → preset (6-day P/P/L mode).

alter table public.user_settings
  drop constraint if exists user_settings_program_mode_check;

update public.user_settings
set program_mode = 'preset'
where program_mode = 'priorities';

alter table public.user_settings
  alter column program_mode set default 'preset';

alter table public.user_settings
  add constraint user_settings_program_mode_check
  check (program_mode in ('preset', 'layout', 'custom'));

comment on column public.user_settings.program_mode is
  'How weeks are built: preset (6-day P/P/L), layout (weekly group allowlist), or custom (manual week).';
