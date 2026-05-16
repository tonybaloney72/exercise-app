-- Expand program_focus presets (core / lower / upper emphasis).

alter table public.user_settings
  drop constraint if exists user_settings_program_focus_check;

alter table public.user_settings
  add constraint user_settings_program_focus_check
  check (
    program_focus in (
      'balanced',
      'minimal_core',
      'core_emphasis',
      'strength',
      'lower_body',
      'upper_body',
      'conditioning'
    )
  );
