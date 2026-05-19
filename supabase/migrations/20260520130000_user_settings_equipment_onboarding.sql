-- Persist equipment onboarding completion on user_settings (not browser localStorage).

alter table public.user_settings
  add column if not exists equipment_onboarding_completed boolean not null default false;

comment on column public.user_settings.equipment_onboarding_completed is
  'True after the user completes or skips the first-run equipment picker.';

-- Existing accounts should not see the modal again.
update public.user_settings
set equipment_onboarding_completed = true
where equipment_onboarding_completed = false;
