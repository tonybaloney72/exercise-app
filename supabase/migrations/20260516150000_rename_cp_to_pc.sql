-- Rename cardio/plyo category CP → PC and exercise ids CP-* → PC-* in persisted data.

update public.exercise_logs
set exercise_id = 'PC-' || substring(exercise_id from 4)
where exercise_id like 'CP-%';

update public.exercise_logs
set swapped_with = 'PC-' || substring(swapped_with from 4)
where swapped_with like 'CP-%';

update public.exercise_settings
set exercise_id = 'PC-' || substring(exercise_id from 4)
where exercise_id like 'CP-%';

update public.user_exercise_preferences
set exercise_id = 'PC-' || substring(exercise_id from 4)
where exercise_id like 'CP-%';

-- Training week JSON snapshots: ids first, then category codes and strengthFocus entries.
update public.user_training_weeks
set days = (
  replace(
    replace(
      replace(
        replace(
          replace(days::text, 'CP-', 'PC-'),
          '"category": "CP"', '"category": "PC"'
        ),
        '", "CP"', '", "PC"'
      ),
      '["CP"', '["PC"'
    ),
    '"CP"]', '"PC"]'
  )::jsonb
)
where days::text like '%CP%';
