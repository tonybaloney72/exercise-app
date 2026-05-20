-- Reusable day workout templates (rounds, stretches, cardio) for customize / build week.

create table public.workout_day_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  plan jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_day_templates_name_len check (char_length(trim(name)) between 1 and 80)
);

create index workout_day_templates_user_updated_idx
  on public.workout_day_templates (user_id, updated_at desc);

alter table public.workout_day_templates enable row level security;

create policy "workout_day_templates_owner_select"
  on public.workout_day_templates for select
  using (auth.uid() = user_id);

create policy "workout_day_templates_owner_insert"
  on public.workout_day_templates for insert
  with check (auth.uid() = user_id);

create policy "workout_day_templates_owner_update"
  on public.workout_day_templates for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workout_day_templates_owner_delete"
  on public.workout_day_templates for delete
  using (auth.uid() = user_id);
