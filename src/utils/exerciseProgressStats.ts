import type { WorkoutLog } from "@/types";
import { exerciseMap } from "@/data/exercises";

export interface ExerciseProgressPoint {
  date: string;
  xLabel: string;
  sortKey: number;
  value: number;
  mode: "reps" | "duration";
  reps: number;
  durationSec: number;
}

function parseDateKeyMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0).getTime();
}

function shortLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${m ?? 1}/${d ?? 1}`;
}

/**
 * Exercises that appear in round logs with at least one numeric
 * `actualReps` or `actualDuration` (completed, not skipped).
 */
export function listExercisesWithNumericProgress(
  history: WorkoutLog[],
): { id: string; name: string }[] {
  const ids = new Set<string>();
  for (const w of history) {
    for (const r of w.rounds) {
      for (const log of r.exercises) {
        if (
          log.completed &&
          !log.skipped &&
          (log.actualReps != null || log.actualDuration != null)
        ) {
          ids.add(log.exerciseId);
        }
      }
    }
  }
  return [...ids]
    .map((id) => ({ id, name: exerciseMap[id]?.name ?? id }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

/**
 * One point per workout date: sums reps / duration across all rounds for that exercise.
 * Plot dimension follows `exerciseMap[id].isTimeBased` when duration was logged; otherwise reps.
 */
export function buildExerciseProgressSeries(
  history: WorkoutLog[],
  exerciseId: string,
): ExerciseProgressPoint[] {
  const meta = exerciseMap[exerciseId];
  const preferDuration = meta?.isTimeBased === true;

  const points: ExerciseProgressPoint[] = [];

  for (const w of history) {
    let reps = 0;
    let durationSec = 0;
    let hadReps = false;
    let hadDur = false;

    for (const r of w.rounds) {
      for (const log of r.exercises) {
        if (log.exerciseId !== exerciseId || !log.completed || log.skipped) continue;
        if (log.actualReps != null) {
          reps += log.actualReps;
          hadReps = true;
        }
        if (log.actualDuration != null) {
          durationSec += log.actualDuration;
          hadDur = true;
        }
      }
    }

    if (!hadReps && !hadDur) continue;

    let mode: "reps" | "duration";
    if (preferDuration && hadDur) mode = "duration";
    else if (hadReps) mode = "reps";
    else if (hadDur) mode = "duration";
    else continue;

    const value = mode === "duration" ? durationSec : reps;

    points.push({
      date: w.date,
      xLabel: shortLabel(w.date),
      sortKey: parseDateKeyMs(w.date),
      value,
      mode,
      reps,
      durationSec,
    });
  }

  points.sort((a, b) => a.sortKey - b.sortKey);

  const wantsDuration = preferDuration && points.some((p) => p.mode === "duration");
  let normalized = wantsDuration
    ? points.filter((p) => p.mode === "duration")
    : points.filter((p) => p.mode === "reps");
  if (normalized.length === 0 && points.length > 0) {
    normalized = points;
  }
  return normalized;
}
