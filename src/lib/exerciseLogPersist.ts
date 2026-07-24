import type { ExerciseLog } from "@/types";
import type { GpsTrackPoint } from "@/lib/geo/gpsTrackSession";

/** Shared shape for save_workout exercise_logs JSON rows. */
export type ExerciseLogPersistMetrics = {
  actual_reps: number | null;
  actual_duration: number | null;
  actual_distance_mi: number | null;
  actual_weight_lb: number | null;
  target_duration_seconds: number | null;
  skipped: boolean;
  swapped_with: string | null;
  notes: string | null;
  step_count: number | null;
  active_calories_kcal: number | null;
  avg_heart_rate_bpm: number | null;
  activity_source: string | null;
  health_source_name: string | null;
  gps_track_points: GpsTrackPoint[] | null;
  activity_start_time: string | null;
  activity_end_time: string | null;
};

function positiveOrNull(n: number | undefined): number | null {
  return n != null && n > 0 ? n : null;
}

/** Map domain ExerciseLog fields that persist to exercise_logs columns. */
export function exerciseLogPersistFields(
  ex: ExerciseLog,
): ExerciseLogPersistMetrics {
  return {
    actual_reps: ex.actualReps ?? null,
    actual_duration: ex.actualDuration ?? null,
    actual_distance_mi: ex.actualDistanceMi ?? null,
    actual_weight_lb: positiveOrNull(ex.weightLb),
    target_duration_seconds: ex.targetDurationSeconds ?? null,
    skipped: ex.skipped,
    swapped_with: ex.swappedWith ?? null,
    notes: ex.notes ?? null,
    step_count: ex.stepCount ?? null,
    active_calories_kcal: ex.activeCaloriesKcal ?? null,
    avg_heart_rate_bpm: ex.avgHeartRateBpm ?? null,
    activity_source: ex.activitySource ?? null,
    health_source_name: ex.healthSourceName ?? null,
    gps_track_points:
      ex.gpsTrackPoints != null && ex.gpsTrackPoints.length > 0
        ? ex.gpsTrackPoints
        : null,
    activity_start_time: ex.activityStartTime ?? null,
    activity_end_time: ex.activityEndTime ?? null,
  };
}
