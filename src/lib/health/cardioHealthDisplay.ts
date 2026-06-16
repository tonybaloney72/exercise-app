import type { CardioActivitySource, ExerciseLog } from "@/types";

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
  if (log.healthSourceName?.trim()) {
    parts.push(log.healthSourceName.trim());
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}
