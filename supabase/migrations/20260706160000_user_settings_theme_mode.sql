alter table public.user_settings
  add column if not exists theme_mode text;

update public.user_settings
set theme_mode = case when dark_mode then 'dark' else 'light' end
where theme_mode is null;

alter table public.user_settings
  alter column theme_mode set default 'auto';

alter table public.user_settings
  alter column theme_mode set not null;

alter table public.user_settings
  drop constraint if exists user_settings_theme_mode_check;

alter table public.user_settings
  add constraint user_settings_theme_mode_check
  check (theme_mode in ('auto', 'light', 'dark'));
