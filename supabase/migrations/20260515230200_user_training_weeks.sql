-- Persisted training week template (Slice 2 — lazy materialized Sun–Sat from catalog until generator/prefs own it).
-- week_start_sunday is the local-calendar Sunday beginning the ISO week row; days holds 7 × DayPlan as JSON (keys "0".."6").

create table public.user_training_weeks (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_sunday date not null,
  days jsonb not null,
  source text not null default 'daily_plans_catalog',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start_sunday)
);

create index user_training_weeks_user_updated_idx
  on public.user_training_weeks (user_id, updated_at desc);

alter table public.user_training_weeks enable row level security;

create policy "training_weeks_owner_select" on public.user_training_weeks
  for select using (auth.uid() = user_id);

create policy "training_weeks_owner_insert" on public.user_training_weeks
  for insert with check (auth.uid() = user_id);

create policy "training_weeks_owner_update" on public.user_training_weeks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "training_weeks_owner_delete" on public.user_training_weeks
  for delete using (auth.uid() = user_id);
