import type { WorkoutLog } from "@/types";
import { exerciseMap } from "@/core/catalog";
import { resolveExerciseDisplayName } from "@/lib/exerciseDisplayName";
import { effectiveExerciseId } from "@/utils/exerciseLogDefaults";
import {
  buildChartDayAxis,
  sortByChartSortKey,
} from "@/utils/localDateKey";

export interface ExerciseProgressPoint {
  date: string;
  xLabel: string;
  sortKey: number;
  value: number;
  mode: "reps" | "duration";
  reps: number;
  durationSec: number;
  /** Completed logs for this exercise that day (one per round slot). */
  setCount: number;
  /** Per-set logged reps, in workout order. */
  repsPerSet: number[];
  /** Per-set logged duration (seconds), in workout order. */
  durationPerSet: number[];
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
          ids.add(effectiveExerciseId(log));
        }
      }
    }
  }
  return [...ids]
    .map((id) => ({ id, name: resolveExerciseDisplayName(id) }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
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
    let setCount = 0;
    const repsPerSet: number[] = [];
    const durationPerSet: number[] = [];

    for (const r of w.rounds) {
      for (const log of r.exercises) {
        if (
          effectiveExerciseId(log) !== exerciseId ||
          !log.completed ||
          log.skipped
        ) {
          continue;
        }
        if (log.actualReps == null && log.actualDuration == null) {
          continue;
        }

        setCount += 1;
        if (log.actualReps != null) {
          reps += log.actualReps;
          repsPerSet.push(log.actualReps);
          hadReps = true;
        }
        if (log.actualDuration != null) {
          durationSec += log.actualDuration;
          durationPerSet.push(log.actualDuration);
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
      ...buildChartDayAxis(w.date),
      value,
      mode,
      reps,
      durationSec,
      setCount,
      repsPerSet,
      durationPerSet,
    });
  }

  sortByChartSortKey(points);

  const wantsDuration =
    preferDuration && points.some((p) => p.mode === "duration");
  let normalized = wantsDuration
    ? points.filter((p) => p.mode === "duration")
    : points.filter((p) => p.mode === "reps");
  if (normalized.length === 0 && points.length > 0) {
    normalized = points;
  }
  return normalized;
}

function formatDurationSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** e.g. `2 sets (10 + 10)` or `1 set (45s)` */
export function formatExerciseProgressSetBreakdown(
  point: ExerciseProgressPoint,
): string {
  const label = point.setCount === 1 ? "1 set" : `${point.setCount} sets`;
  if (point.mode === "duration" && point.durationPerSet.length > 0) {
    const parts = point.durationPerSet.map(formatDurationSeconds);
    return `${label} (${parts.join(" + ")})`;
  }
  if (point.repsPerSet.length > 0) {
    return `${label} (${point.repsPerSet.join(" + ")})`;
  }
  return label;
}

/** Primary + secondary lines for chart tooltip. */
export function exerciseProgressTooltipLines(
  point: ExerciseProgressPoint,
  chartValue: number,
): { primary: string; secondary: string } {
  const breakdown = formatExerciseProgressSetBreakdown(point);
  if (point.mode === "duration") {
    const total =
      formatDurationSeconds(chartValue) || `${Math.round(chartValue)}s total`;
    const primary = `${total} · ${breakdown}`;
    if (point.reps > 0) {
      return { primary, secondary: `${point.reps} reps also logged` };
    }
    return { primary, secondary: "Total time that day" };
  }
  const primary = `${chartValue} reps · ${breakdown}`;
  if (point.durationSec > 0) {
    return {
      primary,
      secondary: `${formatDurationSeconds(point.durationSec)} time also logged`,
    };
  }
  return { primary, secondary: "Total reps that day" };
}

/** Compact sets column for the sessions table. */
export function formatExerciseProgressSetsCell(
  point: ExerciseProgressPoint,
): string {
  if (point.setCount === 0) return "-";
  if (point.mode === "duration" && point.durationPerSet.length > 0) {
    const parts = point.durationPerSet.map(formatDurationSeconds);
    if (point.setCount === 1) return parts[0] ?? "1 set";
    return `${point.setCount} (${parts.join(", ")})`;
  }
  if (point.repsPerSet.length > 0) {
    if (point.setCount === 1) return String(point.repsPerSet[0]);
    return `${point.setCount} (${point.repsPerSet.join(", ")})`;
  }
  return String(point.setCount);
}
