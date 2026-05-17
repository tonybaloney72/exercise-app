-- Optional manual rest start after each round (vs auto-opening the countdown).

alter table public.user_settings
  add column if not exists rest_timer_auto_start bool not null default true;
