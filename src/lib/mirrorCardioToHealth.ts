import { writeAppTrackedCardioToHealth } from "@/lib/health";
import { shouldMirrorCardioCaptureToHealth } from "@/lib/cardioHealthMirrorPolicy";
import type { CardioQuickLogResolution } from "@/lib/health/resolveCardioQuickLog";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import type { CardioActivityKind, CardioActivitySource } from "@/types";

export { shouldMirrorCardioCaptureToHealth } from "@/lib/cardioHealthMirrorPolicy";

export async function mirrorCardioCaptureToHealth(input: {
  kind: CardioActivityKind;
  distanceMi?: number;
  durationSeconds?: number;
  activeCaloriesKcal?: number;
  activityStartTime?: string;
  activityEndTime?: string;
  weightLb?: number;
  healthSource?: CardioActivitySource;
  resolution?: CardioQuickLogResolution | null;
}): Promise<void> {
  if (!isNativePlatform()) return;
  if (!shouldMirrorCardioCaptureToHealth(input)) return;

  const hasDistance =
    input.distanceMi != null && input.distanceMi > 0 && !Number.isNaN(input.distanceMi);
  const hasDuration =
    input.durationSeconds != null &&
    input.durationSeconds > 0 &&
    !Number.isNaN(input.durationSeconds);
  if (!hasDistance && !hasDuration) return;

  const endDate = input.activityEndTime
    ? new Date(input.activityEndTime)
    : new Date();
  const durationForWindow =
    hasDuration && input.durationSeconds! > 0
      ? input.durationSeconds!
      : Math.max(
          60,
          Math.round(
            (endDate.getTime() -
              (input.activityStartTime
                ? new Date(input.activityStartTime).getTime()
                : endDate.getTime())) /
              1000,
          ),
        );
  const startDate = input.activityStartTime
    ? new Date(input.activityStartTime)
    : new Date(endDate.getTime() - durationForWindow * 1000);

  await writeAppTrackedCardioToHealth({
    kind: input.kind,
    distanceMi: hasDistance ? input.distanceMi : undefined,
    durationSeconds: hasDuration ? input.durationSeconds! : durationForWindow,
    activeCaloriesKcal: input.activeCaloriesKcal,
    startDate,
    endDate,
    weightLb: input.weightLb,
  });
}
