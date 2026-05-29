-- Week builder rework (Phase 1): guided blueprint + custom build style.

alter table public.user_settings
  add column if not exists custom_build_style text not null default 'manual',
  add column if not exists week_blueprint jsonb,
  add column if not exists week_blueprint_customized boolean not null default false,
  add column if not exists week_builder_migration_acknowledged boolean not null default false;

comment on column public.user_settings.custom_build_style is
  'Custom program mode only: guided (blueprint + generator) or manual (user picks exercises).';

comment on column public.user_settings.week_blueprint is
  'Guided custom: per-day / per-round week blueprint (day kind, groups, clone specs, cardio).';

comment on column public.user_settings.week_builder_migration_acknowledged is
  'User dismissed the week-builder migration banner (layout mode retired).';
