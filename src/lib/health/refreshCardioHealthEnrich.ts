import type { ExerciseLog, WorkoutLog } from "@/types";
import { enrichCardioHealthMeta } from "@/lib/health/cardioHealth";
import { applyCardioHealthMeta } from "@/lib/health/cardioHealthFields";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { clientTrace } from "@/lib/diagnostics/clientTrace";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { hydrateCardioFromNotes } from "@/lib/workoutCardioPersistence";

function cardioRows(log: WorkoutLog) {
  return hydrateCardioFromNotes(log).cardioExercises ?? [];
}

function resolveActivityWindow(
  row: ExerciseLog,
  log: WorkoutLog,
): { start: Date; end: Date } | undefined {
  if (row.activityStartTime && row.activityEndTime) {
    const start = new Date(row.activityStartTime);
    const end = new Date(row.activityEndTime);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return { start, end };
    }
  }
  if (log.startTime && log.endTime) {
    const start = new Date(log.startTime);
    const end = new Date(log.endTime);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return { start, end };
    }
  }
  return undefined;
}

/** Refresh HC steps/kcal/HR for today's ME-tracked cardio; never overwrites ME distance/duration. */
export async function refreshAppTrackedCardioHealthEnrich(
  history: WorkoutLog[],
  todayKey: string = formatLocalDateKey(),
): Promise<{ history: WorkoutLog[]; changed: WorkoutLog[] }> {
  if (!isNativePlatform()) return { history, changed: [] };

  const changed: WorkoutLog[] = [];
  let next = history;

  for (const log of history) {
    if (log.date !== todayKey) continue;

    let logChanged = false;
    const updatedRows = [];

    for (const row of cardioRows(log)) {
      if (row.activitySource !== "gps") {
        updatedRows.push(row);
        continue;
      }

      const window = resolveActivityWindow(row, log);
      if (!window) {
        updatedRows.push(row);
        continue;
      }

      const enriched = await enrichCardioHealthMeta(window.start, window.end, {
        stepCount: row.stepCount,
        activeCaloriesKcal: row.activeCaloriesKcal,
        avgHeartRateBpm: row.avgHeartRateBpm,
        healthSourceName: row.healthSourceName,
        source: "gps",
      });

      if (!enriched) {
        updatedRows.push(row);
        continue;
      }

      const patch = applyCardioHealthMeta({ ...enriched, source: "gps" });
      const merged = {
        ...row,
        ...patch,
        actualDistanceMi: row.actualDistanceMi,
        actualDuration: row.actualDuration,
      };

      const rowChanged =
        merged.stepCount !== row.stepCount ||
        merged.activeCaloriesKcal !== row.activeCaloriesKcal ||
        merged.avgHeartRateBpm !== row.avgHeartRateBpm ||
        merged.healthSourceName !== row.healthSourceName;

      if (rowChanged) logChanged = true;
      updatedRows.push(merged);
    }

    if (logChanged) {
      const updated = { ...log, cardioExercises: updatedRows };
      changed.push(updated);
      next = next.map((w) => (w.id === log.id ? updated : w));
    }
  }

  if (changed.length > 0) {
    clientTrace("health-cardio", "resync_enrich_ok", {
      todayKey,
      workouts: changed.length,
    });
  }

  return { history: next, changed };
}
