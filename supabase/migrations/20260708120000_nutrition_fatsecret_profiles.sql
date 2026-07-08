-- FatSecret per-user OAuth tokens (server-only via service role; no RLS policies).

create table public.nutrition_fatsecret_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  auth_token text not null,
  auth_secret_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nutrition_fatsecret_profiles enable row level security;

comment on table public.nutrition_fatsecret_profiles is
  'FatSecret profile OAuth 1.0 tokens per app user. auth_secret is AES-256-GCM encrypted by the app server before insert.';

comment on column public.nutrition_fatsecret_profiles.auth_secret_encrypted is
  'Base64(iv + authTag + ciphertext) produced by the nutrition API server.';
