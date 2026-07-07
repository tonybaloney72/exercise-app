import type { CardioHealthMeta } from "@/lib/health/cardioHealth";
import { normalizeHealthSourceDisplayName } from "@/lib/health/healthSourceDisplayName";
import type { ExerciseLog } from "@/types";

/** Map health metadata onto structured {@link ExerciseLog} fields (not notes). */
export function applyCardioHealthMeta(
  health?: CardioHealthMeta,
): Partial<ExerciseLog> {
  if (!health) return {};
  return {
    stepCount: health.stepCount,
    activeCaloriesKcal: health.activeCaloriesKcal,
    avgHeartRateBpm: health.avgHeartRateBpm,
    activitySource: health.source,
    healthSourceName: normalizeHealthSourceDisplayName({
      sourceName: health.healthSourceName,
    }),
  };
}
