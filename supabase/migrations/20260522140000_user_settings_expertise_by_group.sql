-- Per emphasis-group skill caps for generator / swap filtering.

alter table public.user_settings
  add column if not exists expertise_by_group jsonb not null default '{
    "core": "intermediate",
    "cardio": "intermediate",
    "lower": "intermediate",
    "upper_push": "intermediate",
    "upper_pull": "intermediate"
  }'::jsonb;

alter table public.user_settings
  add column if not exists expertise_by_group_customized boolean not null default false;

comment on column public.user_settings.expertise_by_group is
  'User skill level per emphasis group (beginner … expert). Always applied by the app.';

comment on column public.user_settings.expertise_by_group_customized is
  'Deprecated: kept for schema compatibility; app always applies expertise_by_group.';
