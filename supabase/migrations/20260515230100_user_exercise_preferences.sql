-- Per-exercise favorites / exclusions for authenticated users (Slice 1 — dynamic plans foundation).
-- Absence of a row means neutral (neither favorite nor disliked).

create type public.exercise_preference_kind as enum ('favorite', 'disliked');

create table public.user_exercise_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  preference public.exercise_preference_kind not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create index user_exercise_preferences_user_updated_idx
  on public.user_exercise_preferences (user_id, updated_at desc);

alter table public.user_exercise_preferences enable row level security;

create policy "exercise_prefs_owner_select" on public.user_exercise_preferences
  for select using (auth.uid() = user_id);

create policy "exercise_prefs_owner_insert" on public.user_exercise_preferences
  for insert with check (auth.uid() = user_id);

create policy "exercise_prefs_owner_update" on public.user_exercise_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "exercise_prefs_owner_delete" on public.user_exercise_preferences
  for delete using (auth.uid() = user_id);
