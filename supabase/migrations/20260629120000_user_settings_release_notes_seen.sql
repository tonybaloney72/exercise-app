-- Track dismissed What's New release note ids per signed-in user (cross-device).

alter table public.user_settings
  add column if not exists release_notes_seen_ids text[] not null default '{}';

comment on column public.user_settings.release_notes_seen_ids is
  'Release note ids the user dismissed in What''s New (synced across devices).';
