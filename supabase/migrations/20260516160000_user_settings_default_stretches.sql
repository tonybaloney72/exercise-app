-- Default warm-up / cool-down stretch lists (Settings → always include)

alter table public.user_settings
  add column if not exists default_warm_up jsonb,
  add column if not exists default_cool_down jsonb;
