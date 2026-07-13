-- Remember Health Connect workout-write preference (skip re-prompt after decline).

alter table public.user_settings
  add column if not exists write_workouts_to_health_connect bool not null default true;
