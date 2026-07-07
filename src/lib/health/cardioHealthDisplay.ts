import type { CardioActivitySource, ExerciseLog } from "@/types";
import { formatCardioPaceSummary } from "@/lib/health/cardioPaceMetrics";
import { displayHealthSourceName } from "@/lib/health/healthSourceDisplayName";

const SOURCE_LABELS: Record<CardioActivitySource, string> = {
  manual: "Manual",
  gps: "GPS",
  health_connect: "Health Connect",
};

export type CardioHealthDisplayFields = Pick<
  ExerciseLog,
  | "stepCount"
  | "activeCaloriesKcal"
  | "avgHeartRateBpm"
  | "activitySource"
  | "healthSourceName"
  | "actualDistanceMi"
  | "actualDuration"
>;

export function formatCardioHealthSummary(
  log: CardioHealthDisplayFields,
): string | undefined {
  const parts: string[] = [];
  if (log.stepCount != null && log.stepCount > 0) {
    parts.push(`${log.stepCount.toLocaleString()} steps`);
  }
  if (log.activeCaloriesKcal != null && log.activeCaloriesKcal > 0) {
    parts.push(`${Math.round(log.activeCaloriesKcal)} active kcal`);
  }
  if (log.avgHeartRateBpm != null && log.avgHeartRateBpm > 0) {
    parts.push(`${Math.round(log.avgHeartRateBpm)} bpm avg`);
  }
  if (log.activitySource) {
    parts.push(SOURCE_LABELS[log.activitySource]);
  }
  const recordedBy = displayHealthSourceName(log.healthSourceName);
  if (recordedBy) {
    parts.push(recordedBy);
  }
  if (log.activitySource === "gps") {
    const pace = formatCardioPaceSummary(
      log.actualDistanceMi,
      log.actualDuration,
    );
    if (pace) parts.push(pace);
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}
