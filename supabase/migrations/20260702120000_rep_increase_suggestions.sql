-- Rep-increase suggestion preferences (global toggle + per-exercise state).

alter table public.user_settings
  add column if not exists suggest_rep_increases bool not null default false;

alter table public.exercise_settings
  add column if not exists rep_suggestion_ignored bool not null default false;

alter table public.exercise_settings
  add column if not exists rep_suggestion_snoozed_until date;

alter table public.exercise_settings
  add column if not exists rep_suggestion_last_accepted_at date;
