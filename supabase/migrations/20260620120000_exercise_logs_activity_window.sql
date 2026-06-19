-- Persist ME activity window on cardio exercise_logs rows (Start/End times).

alter table public.exercise_logs
  add column if not exists activity_start_time timestamptz,
  add column if not exists activity_end_time timestamptz;

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
    warm_up_completed, cool_down_completed,
    notes, start_time, end_time, paused
  ) values (
    v_workout_id,
    v_user_id,
    (p_workout_log->>'date')::date,
    (p_workout_log->>'day_of_week')::smallint,
    coalesce((p_workout_log->>'warm_up_completed')::bool, false),
    coalesce((p_workout_log->>'cool_down_completed')::bool, false),
    p_workout_log->>'notes',
    nullif(p_workout_log->>'start_time', '')::timestamptz,
    nullif(p_workout_log->>'end_time', '')::timestamptz,
    coalesce((p_workout_log->>'paused')::bool, false)
  )
  on conflict (id) do update set
    date = excluded.date,
    day_of_week = excluded.day_of_week,
    warm_up_completed = excluded.warm_up_completed,
    cool_down_completed = excluded.cool_down_completed,
    notes = excluded.notes,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    paused = excluded.paused,
    updated_at = now();

  delete from public.exercise_logs where workout_log_id = v_workout_id;

  insert into public.exercise_logs (
    workout_log_id, user_id, section, round_number, position,
    exercise_id, completed, actual_reps, actual_duration,
    actual_distance_mi,
    target_duration_seconds,
    skipped, swapped_with, notes,
    step_count, active_calories_kcal, avg_heart_rate_bpm,
    activity_source, health_source_name,
    gps_track_points,
    activity_start_time, activity_end_time
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
    nullif(el->>'actual_distance_mi', '')::numeric,
    nullif(el->>'target_duration_seconds', '')::int,
    coalesce((el->>'skipped')::bool, false),
    el->>'swapped_with',
    el->>'notes',
    nullif(el->>'step_count', '')::int,
    nullif(el->>'active_calories_kcal', '')::int,
    nullif(el->>'avg_heart_rate_bpm', '')::smallint,
    nullif(el->>'activity_source', ''),
    nullif(el->>'health_source_name', ''),
    el->'gps_track_points',
    nullif(el->>'activity_start_time', '')::timestamptz,
    nullif(el->>'activity_end_time', '')::timestamptz
  from jsonb_array_elements(p_exercise_logs) as el;
end;
$$;

grant execute on function public.save_workout(jsonb, jsonb) to authenticated;
