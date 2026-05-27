-- User toggle for P4b progression-family regression filtering (default on).
alter table public.user_settings
  add column if not exists progression_families_enabled boolean not null default true;

comment on column public.user_settings.progression_families_enabled is
  'When true, generator/swap omit regression steps below skill cap within curated progression families.';
