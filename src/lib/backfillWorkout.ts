import type { WorkoutLog } from "@/types";
import { compareDateKeyToRef } from "@/lib/workoutHistoryCalendar";
import { formatLocalDateKey } from "@/utils/localDateKey";
import {
  findCompletedWorkoutForDate,
  findInProgressWorkoutForDate,
} from "@/utils/workoutLogLookup";
import { parseLocalDateKey } from "@/utils/weekCalendar";

export type BackfillEligibility =
  | { ok: true }
  | { ok: false; reason: string };

export function localNoonIsoForDateKey(dateKey: string): string | null {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) return null;
  parsed.setHours(12, 0, 0, 0);
  return parsed.toISOString();
}

/** Whether the user may start a retroactive log for this calendar day. */
export function getBackfillEligibility(options: {
  dateKey: string;
  workoutHistory: WorkoutLog[];
  activeWorkout: WorkoutLog | null;
  todayKey?: string;
}): BackfillEligibility {
  const todayKey = options.todayKey ?? formatLocalDateKey();
  const { dateKey, workoutHistory, activeWorkout } = options;

  if (!parseLocalDateKey(dateKey)) {
    return { ok: false, reason: "Invalid date." };
  }

  const when = compareDateKeyToRef(dateKey, todayKey);
  if (when === "future") {
    return { ok: false, reason: "You cannot log a workout for a future day." };
  }
  if (when === "today") {
    return {
      ok: false,
      reason: "For today, start the workout from the Today tab.",
    };
  }

  if (findCompletedWorkoutForDate(workoutHistory, dateKey)) {
    return { ok: false, reason: "This day already has a completed workout." };
  }

  const inProgress = findInProgressWorkoutForDate(workoutHistory, dateKey);
  if (inProgress) {
    return {
      ok: false,
      reason: "A workout for this day is already in progress.",
    };
  }

  if (activeWorkout && !activeWorkout.endTime) {
    return {
      ok: false,
      reason: "Finish or discard your current workout before logging another day.",
    };
  }

  return { ok: true };
}

/** Resume an existing in-progress log for a calendar day (stale / backfill sessions). */
export function canResumeInProgressForDate(options: {
  dateKey: string;
  workoutHistory: WorkoutLog[];
  activeWorkout: WorkoutLog | null;
}): BackfillEligibility {
  const { dateKey, workoutHistory, activeWorkout } = options;

  if (!parseLocalDateKey(dateKey)) {
    return { ok: false, reason: "Invalid date." };
  }

  const inProgress = findInProgressWorkoutForDate(workoutHistory, dateKey);
  if (!inProgress) {
    return { ok: false, reason: "No saved in-progress workout for this day." };
  }

  if (activeWorkout && !activeWorkout.endTime && activeWorkout.id !== inProgress.id) {
    return {
      ok: false,
      reason: "Finish or discard your current workout before continuing another day.",
    };
  }

  return { ok: true };
}
