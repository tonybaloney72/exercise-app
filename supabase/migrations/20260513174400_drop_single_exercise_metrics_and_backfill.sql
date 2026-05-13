-- =====================================================================
-- Drop the legacy single-exercise tracking columns from user_settings.
-- We're moving toward per-exercise tracking (derived from exercise_logs)
-- so it no longer makes sense to special-case push-ups and jogging here.
--
-- Also backfill profiles + user_settings rows for any auth.users that
-- predate the handle_new_user trigger. Idempotent — safe on a fresh DB
-- (the WHERE NOT EXISTS clauses make the inserts no-ops).
-- =====================================================================

alter table public.user_settings
  drop column if exists current_push_up_max,
  drop column if exists current_jog_distance,
  drop column if exists current_jog_best_time_seconds;

insert into public.profiles (id)
select u.id
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

insert into public.user_settings (user_id)
select u.id
from auth.users u
where not exists (
  select 1 from public.user_settings s where s.user_id = u.id
);
