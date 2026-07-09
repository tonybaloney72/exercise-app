-- Body profile fields for BMR / passive calorie estimates on Nutrition.
alter table public.user_settings
  add column if not exists body_sex_at_birth text
    check (body_sex_at_birth is null or body_sex_at_birth in ('male', 'female')),
  add column if not exists body_birth_date date,
  add column if not exists body_height_in numeric(4, 1);
