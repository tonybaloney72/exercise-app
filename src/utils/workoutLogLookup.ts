import type { WorkoutLog } from "@/types";
import { formatLocalDateKey } from "@/utils/localDateKey";

/**
 * Resolve a workout log for a calendar day (local). Matches `date` first, then
 * `endTime` mapped to local date (same behavior as Today).
 */
export function findWorkoutLogForDate(
  workoutHistory: WorkoutLog[],
  dateKey: string,
): WorkoutLog | null {
  const byStoredDate = workoutHistory.find((w) => w.date === dateKey);
  if (byStoredDate) return byStoredDate;
  return (
    workoutHistory.find(
      (w) =>
        w.endTime &&
        formatLocalDateKey(new Date(w.endTime)) === dateKey,
    ) ?? null
  );
}
