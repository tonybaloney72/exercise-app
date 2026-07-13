-- Optional: stop/close set timer marks exercise complete and fills "Did".

alter table public.user_settings
  add column if not exists complete_exercise_on_set_timer_stop bool not null default false;
