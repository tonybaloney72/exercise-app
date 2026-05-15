-- Align column default with app: bodyweight only until user selects gear in Settings / onboarding.

alter table public.user_settings
  alter column available_equipment set default '["bodyweight"]'::jsonb;
