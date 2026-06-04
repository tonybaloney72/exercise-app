import type { UserSettings } from "@/types";

/** Stable dependency key when equipment changes (plan regen). */
export function selectEquipmentDependencyKey(
  s: Pick<UserSettings, "availableEquipment">,
): string {
  return s.availableEquipment.join(",");
}

/** Full settings fingerprint used by day-plan resolution. */
export function selectProgramProfileKeyDayPlan(
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

/** Week overview resolution (subset of day-plan deps). */
export function selectProgramProfileKeyWeekPlans(
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
  >,
): string {
  return `${s.programMode}:${s.customBuildStyle}:${s.weekBlueprintCustomized}:${JSON.stringify(s.weekBlueprint)}:${s.trainingPriorityPreset}:${s.trainingPriorityCustomized}:${JSON.stringify(s.trainingPriorityScores)}:${s.roundDensity}`;
}

/** Progress page week resolve (preset + density only). */
export function selectProgramProfileKeyProgress(
  s: Pick<UserSettings, "trainingPriorityPreset" | "roundDensity">,
): string {
  return `${s.trainingPriorityPreset}:${s.roundDensity}`;
}
