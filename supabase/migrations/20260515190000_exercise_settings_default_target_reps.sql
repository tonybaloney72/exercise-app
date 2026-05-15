-- Optional default rep count when default_set_mode = 'reps' (Library + workout display).

alter table public.exercise_settings
  add column if not exists default_target_reps int
    constraint exercise_settings_target_reps_chk
      check (default_target_reps is null or default_target_reps > 0);
