-- =====================================================================
-- Initial schema for Supabase Auth and Data phase.
--
-- Tables: profiles, user_settings, workout_logs, exercise_logs
-- Trigger: handle_new_user — auto-creates profile + settings on signup
-- RPC:     save_workout — atomic upsert of a workout + its exercise logs
-- RLS:     owner-only access on every user-scoped table
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.exercise_log_section as enum ('warm_up', 'round', 'cool_down');

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_owner_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_owner_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- Insert is handled by the handle_new_user trigger; delete cascades from auth.users.

-- ---------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rest_between_rounds int not null default 90,
  current_push_up_max int,
  current_jog_distance numeric(5,2),
  current_jog_best_time_seconds int,
  week_start_date date,
  dark_mode bool not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "settings_owner_select" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "settings_owner_insert" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "settings_owner_update" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "settings_owner_delete" on public.user_settings
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- workout_logs
-- ---------------------------------------------------------------------
create table public.workout_logs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  day_of_week smallint not null,
  jog_completed bool not null default false,
  jog_distance numeric(5,2),
  jog_duration_seconds int,
  warm_up_completed bool not null default false,
  cool_down_completed bool not null default false,
  notes text,
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_logs_user_date_idx
  on public.workout_logs (user_id, date desc);

alter table public.workout_logs enable row level security;

create policy "workout_logs_owner_select" on public.workout_logs
  for select using (auth.uid() = user_id);
create policy "workout_logs_owner_insert" on public.workout_logs
  for insert with check (auth.uid() = user_id);
create policy "workout_logs_owner_update" on public.workout_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_logs_owner_delete" on public.workout_logs
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- exercise_logs
-- ---------------------------------------------------------------------
create table public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  section public.exercise_log_section not null,
  round_number smallint,
  position smallint not null,
  exercise_id text not null,
  completed bool not null default false,
  actual_reps int,
  actual_duration int,
  skipped bool not null default false,
  swapped_with text,
  notes text,
  created_at timestamptz not null default now()
);

create index exercise_logs_workout_idx
  on public.exercise_logs (workout_log_id);
create index exercise_logs_user_exercise_idx
  on public.exercise_logs (user_id, exercise_id);

alter table public.exercise_logs enable row level security;

create policy "exercise_logs_owner_select" on public.exercise_logs
  for select using (auth.uid() = user_id);
create policy "exercise_logs_owner_insert" on public.exercise_logs
  for insert with check (auth.uid() = user_id);
create policy "exercise_logs_owner_update" on public.exercise_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exercise_logs_owner_delete" on public.exercise_logs
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- handle_new_user trigger
--
-- Fires after a user is inserted into auth.users (signup). Creates the
-- profile + default user_settings rows so the rest of the app can
-- assume they exist.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- save_workout RPC
--
-- Atomically upserts a workout_logs row and replaces all of its
-- exercise_logs. RLS still applies because the function runs as the
-- caller (security invoker). Errors propagate as a single transaction.
-- ---------------------------------------------------------------------
create or replace function public.save_workout(
  p_workout_log jsonb,
  p_exercise_logs jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_workout_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  v_workout_id := (p_workout_log->>'id')::uuid;

  insert into public.workout_logs (
    id, user_id, date, day_of_week,
    jog_completed, jog_distance, jog_duration_seconds,
    warm_up_completed, cool_down_completed,
    notes, start_time, end_time
  ) values (
    v_workout_id,
    v_user_id,
    (p_workout_log->>'date')::date,
    (p_workout_log->>'day_of_week')::smallint,
    coalesce((p_workout_log->>'jog_completed')::bool, false),
    nullif(p_workout_log->>'jog_distance', '')::numeric,
    nullif(p_workout_log->>'jog_duration_seconds', '')::int,
    coalesce((p_workout_log->>'warm_up_completed')::bool, false),
    coalesce((p_workout_log->>'cool_down_completed')::bool, false),
    p_workout_log->>'notes',
    nullif(p_workout_log->>'start_time', '')::timestamptz,
    nullif(p_workout_log->>'end_time', '')::timestamptz
  )
  on conflict (id) do update set
    date = excluded.date,
    day_of_week = excluded.day_of_week,
    jog_completed = excluded.jog_completed,
    jog_distance = excluded.jog_distance,
    jog_duration_seconds = excluded.jog_duration_seconds,
    warm_up_completed = excluded.warm_up_completed,
    cool_down_completed = excluded.cool_down_completed,
    notes = excluded.notes,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    updated_at = now();

  delete from public.exercise_logs where workout_log_id = v_workout_id;

  insert into public.exercise_logs (
    workout_log_id, user_id, section, round_number, position,
    exercise_id, completed, actual_reps, actual_duration,
    skipped, swapped_with, notes
  )
  select
    v_workout_id,
    v_user_id,
    (el->>'section')::public.exercise_log_section,
    nullif(el->>'round_number', '')::smallint,
    (el->>'position')::smallint,
    el->>'exercise_id',
    coalesce((el->>'completed')::bool, false),
    nullif(el->>'actual_reps', '')::int,
    nullif(el->>'actual_duration', '')::int,
    coalesce((el->>'skipped')::bool, false),
    el->>'swapped_with',
    el->>'notes'
  from jsonb_array_elements(p_exercise_logs) as el;
end;
$$;

grant execute on function public.save_workout(jsonb, jsonb) to authenticated;
