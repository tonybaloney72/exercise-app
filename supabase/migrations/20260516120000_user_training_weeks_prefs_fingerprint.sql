-- Slice 3: track which dislike/equipment inputs materialized the week (invalidation; Slice 4 UX builds on this).

alter table public.user_training_weeks
  add column if not exists prefs_fingerprint text;
