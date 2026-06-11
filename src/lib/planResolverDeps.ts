import type { UserSettings } from "@/types";

/** Stable key when default warm-up / cool-down lists change. */
export function selectStretchDefaultsKey(
  s: Pick<UserSettings, "defaultWarmUp" | "defaultCoolDown">,
): string {
  return [...s.defaultWarmUp, ...s.defaultCoolDown]
    .map((e) => `${e.exerciseId}:${e.targetReps}`)
    .join("|");
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
