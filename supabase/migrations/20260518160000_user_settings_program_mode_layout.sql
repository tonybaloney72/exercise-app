-- A3: program mode (priorities | layout | custom) + weekly group layout per day

alter table public.user_settings
  add column if not exists program_mode text not null default 'priorities',
  add column if not exists weekly_category_layout jsonb,
  add column if not exists weekly_category_layout_customized boolean not null default false;

alter table public.user_settings
  drop constraint if exists user_settings_program_mode_check;

alter table public.user_settings
  add constraint user_settings_program_mode_check
  check (program_mode in ('priorities', 'layout', 'custom'));
