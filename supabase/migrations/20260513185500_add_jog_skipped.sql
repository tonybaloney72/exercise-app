-- Add the `jog_skipped` flag so the jog can be explicitly marked
-- "did not do" without it being indistinguishable from "not yet done".
-- Mirrors the completed/skipped pair on exercise_logs.

alter table public.workout_logs
  add column if not exists jog_skipped bool not null default false;

-- Recreate save_workout so the RPC writes the new column.
-- (Body is identical to the previous version except for the new field.)
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
    jog_completed, jog_skipped, jog_distance, jog_duration_seconds,
    warm_up_completed, cool_down_completed,
    notes, start_time, end_time
  ) values (
    v_workout_id,
    v_user_id,
    (p_workout_log->>'date')::date,
    (p_workout_log->>'day_of_week')::smallint,
    coalesce((p_workout_log->>'jog_completed')::bool, false),
    coalesce((p_workout_log->>'jog_skipped')::bool, false),
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
    jog_skipped = excluded.jog_skipped,
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
