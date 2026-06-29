import type { UserSettings } from "@/types";

/** Stable key when per-day stretch counts change. */
export function selectStretchDefaultsKey(
  s: Pick<UserSettings, "warmUpStretchCount" | "coolDownStretchCount">,
): string {
  return `w${s.warmUpStretchCount}|c${s.coolDownStretchCount}`;
}

/** Stable dependency key when equipment changes (plan regen). */
export function selectEquipmentDependencyKey(
  s: Pick<UserSettings, "availableEquipment">,
): string {
  return s.availableEquipment.join(",");
}

/** Canonical settings fingerprint for training-week session cache + plan resolution. */
export function selectTrainingWeekCacheKey(
  s: Pick<
    UserSettings,
    | "programMode"
    | "customBuildStyle"
    | "weekBlueprintCustomized"
    | "weekBlueprint"
    | "trainingPriorityPreset"
    | "trainingPriorityCustomized"
    | "trainingPriorityScores"
    | "roundDensity"
    | "weeklyPplSchedule"
    | "weeklyPplScheduleCustomized"
    | "weeklyRestDays"
    | "weeklyRestDaysCustomized"
  >,
): string {
  return `${s.programMode}:${s.customBuildStyle}:${s.weekBlueprintCustomized}:${JSON.stringify(s.weekBlueprint)}:${s.trainingPriorityPreset}:${s.trainingPriorityCustomized}:${JSON.stringify(s.trainingPriorityScores)}:${s.roundDensity}:${JSON.stringify(s.weeklyPplSchedule)}:${s.weeklyPplScheduleCustomized}:${JSON.stringify(s.weeklyRestDays)}:${s.weeklyRestDaysCustomized}`;
}
