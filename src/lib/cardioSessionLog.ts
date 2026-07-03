import type { GpsTrackPoint } from "@/lib/geo/gpsTrackSession";
import { applyCardioHealthMeta } from "@/lib/health/cardioHealthFields";
import type { CardioHealthMeta } from "@/lib/health/cardioHealth";
import type { ExerciseLog } from "@/types";

export type CardioSessionCaptureInput = {
  distanceMi?: number;
  durationSeconds?: number;
  health?: CardioHealthMeta;
  gpsTrackPoints?: readonly GpsTrackPoint[];
  activityStartTime?: string;
  activityEndTime?: string;
};

/** Patch applied to an in-workout cardio row after recorder / Health Connect capture. */
export function buildCardioSessionCapturePatch(
  input: CardioSessionCaptureInput,
): Partial<ExerciseLog> {
  const hasGps =
    input.gpsTrackPoints != null && input.gpsTrackPoints.length >= 2;
  const healthFields = applyCardioHealthMeta(input.health);
  const hcRoute =
    hasGps && input.health?.source === "health_connect";
  return {
    completed: true,
    skipped: false,
    actualDistanceMi: input.distanceMi,
    actualDuration: input.durationSeconds,
    ...healthFields,
    ...(hasGps
      ? {
          gpsTrackPoints: [...input.gpsTrackPoints!],
          activitySource: hcRoute ? ("health_connect" as const) : ("gps" as const),
        }
      : healthFields.activitySource
        ? {}
        : input.activityStartTime && input.activityEndTime
          ? { activitySource: "manual" as const }
          : {}),
    ...(input.activityStartTime
      ? { activityStartTime: input.activityStartTime }
      : {}),
    ...(input.activityEndTime ? { activityEndTime: input.activityEndTime } : {}),
  };
}
