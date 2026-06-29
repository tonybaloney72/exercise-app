-- Per-day warm-up / cool-down stretch counts (Settings → Your Week)

alter table public.user_settings
  add column if not exists warm_up_stretch_count integer,
  add column if not exists cool_down_stretch_count integer;

update public.user_settings
set
  warm_up_stretch_count = coalesce(warm_up_stretch_count, 4),
  cool_down_stretch_count = coalesce(cool_down_stretch_count, 5)
where warm_up_stretch_count is null
   or cool_down_stretch_count is null;
