-- Per-user defaults for how an exercise is performed (reps vs timer).
-- Catalog (names, categories, videos) remains in the app; exercise_id matches TS ids.

create table public.exercise_settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null,
  default_set_mode text not null default 'reps'
    constraint exercise_settings_mode_chk
      check (default_set_mode in ('reps', 'timer')),
  default_timer_seconds int
    constraint exercise_settings_timer_chk
      check (default_timer_seconds is null or default_timer_seconds > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create index exercise_settings_user_idx
  on public.exercise_settings (user_id);

alter table public.exercise_settings enable row level security;

create policy "exercise_settings_owner_select" on public.exercise_settings
  for select using (auth.uid() = user_id);

create policy "exercise_settings_owner_insert" on public.exercise_settings
  for insert with check (auth.uid() = user_id);

create policy "exercise_settings_owner_update" on public.exercise_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "exercise_settings_owner_delete" on public.exercise_settings
  for delete using (auth.uid() = user_id);
