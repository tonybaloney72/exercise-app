-- Timer feedback + optional screen wake lock (battery vs visibility during workouts).

alter table public.user_settings
  add column if not exists timer_sounds_enabled bool not null default true;

alter table public.user_settings
  add column if not exists timer_vibration_enabled bool not null default true;

alter table public.user_settings
  add column if not exists keep_screen_awake bool not null default false;
