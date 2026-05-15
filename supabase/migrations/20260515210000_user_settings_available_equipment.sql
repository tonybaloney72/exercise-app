-- Equipment the user has access to (library filtering + future custom routines).

alter table public.user_settings
  add column if not exists available_equipment jsonb not null
    default '["bodyweight"]'::jsonb;
