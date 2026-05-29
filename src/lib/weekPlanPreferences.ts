import {
  applyWeeklyCardioToDay,
  normalizeDayPlanCardio,
  sanitizeWeeklyCardioByDay,
  suggestWeeklyCardioFromCatalog,
  weeklyCardioEqual,
} from "@/lib/cardioActivities";
import {
  resolveWeeklyPplSchedule,
  sanitizePplWeeklyCardioByDayForSchedule,
  sanitizeWeeklyPplSchedule,
  suggestWeeklyCardioFromPplSchedule,
  weeklyPplScheduleEqual,
} from "@/lib/pplWeekSchedule";
import {
  applyDayBlueprintMetadata,
  resolveDayBlueprintForSettings,
  sanitizeWeekBlueprint,
  suggestWeekBlueprintFromCatalog,
  weekBlueprintEqual,
} from "@/lib/weekBlueprint";
import { isGuidedCustomSettings } from "@/lib/weekBlueprintPolicy";
import { isPresetProgramMode } from "@/lib/weekSeed";
import {
  applyRestDayToPlan,
  resolveRestDayMode,
  sanitizeWeeklyRestDays,
} from "@/lib/restDays";
import type { TrainingWeekDays } from "@/lib/repos";
import type { DayPlan, ExerciseEquipment, UserSettings } from "@/types";

export function suggestWeeklyCardioForSettings(
  settings: UserSettings,
): Record<number, import("@/types").CardioActivityKind[]> {
  return isPresetProgramMode(settings.programMode)
    ? suggestWeeklyCardioFromPplSchedule(resolveWeeklyPplSchedule(settings))
    : suggestWeeklyCardioFromCatalog();
}

export function resolveWeeklyCardioByDay(
  settings: UserSettings,
): Record<number, import("@/types").CardioActivityKind[]> {
  const fallback = suggestWeeklyCardioForSettings(settings);
  const resolved = !settings.weeklyCardioCustomized
    ? fallback
    : sanitizeWeeklyCardioByDay(settings.weeklyCardioByDay, fallback);
  if (!isPresetProgramMode(settings.programMode)) {
    return resolved;
  }
  return sanitizePplWeeklyCardioByDayForSchedule(
    resolved,
    resolveWeeklyPplSchedule(settings),
  );
}

/** Apply settings rest + cardio before generator materialization. */
export function prepareCatalogDayForUser(
  plan: DayPlan,
  settings: UserSettings,
  availableEquipment: ExerciseEquipment[],
): DayPlan {
  if (isGuidedCustomSettings(settings)) {
    const day = resolveDayBlueprintForSettings(settings, plan.dayOfWeek);
    return normalizeDayPlanCardio(
      applyDayBlueprintMetadata(plan, day, availableEquipment),
    );
  }
  if (settings.programMode === "custom") {
    return normalizeDayPlanCardio({ ...plan, restDayMode: "workout" });
  }
  const cardioKinds = resolveWeeklyCardioByDay(settings)[plan.dayOfWeek] ?? [];
  let next = applyWeeklyCardioToDay(plan, cardioKinds, availableEquipment);
  const restMode = resolveRestDayMode(plan.dayOfWeek, settings);
  next = applyRestDayToPlan(next, restMode);
  return normalizeDayPlanCardio(next);
}

/** Apply settings rest + cardio before generator materialization. */
export function prepareWeekSeedForUser(
  seedWeek: TrainingWeekDays,
  settings: UserSettings,
  availableEquipment: ExerciseEquipment[],
): TrainingWeekDays {
  const out: TrainingWeekDays = {};
  for (let i = 0; i < 7; i++) {
    const day = seedWeek[i];
    if (!day) continue;
    out[i] = prepareCatalogDayForUser(day, settings, availableEquipment);
  }
  return out;
}

/** @deprecated Use {@link prepareWeekSeedForUser}. */
export function prepareCatalogWeekForUser(
  catalogWeek: TrainingWeekDays,
  settings: UserSettings,
  availableEquipment: ExerciseEquipment[],
): TrainingWeekDays {
  return prepareWeekSeedForUser(catalogWeek, settings, availableEquipment);
}

export function weekBlueprintSettingsChanged(
  partial: Partial<UserSettings>,
  current: UserSettings,
): boolean {
  const nextMode = partial.programMode ?? current.programMode;
  const nextStyle = partial.customBuildStyle ?? current.customBuildStyle;
  const guidedRelevant =
    (nextMode === "custom" && nextStyle === "guided") ||
    isGuidedCustomSettings(current);
  if (!guidedRelevant) return false;
  if (partial.weekBlueprint != null) {
    const next = sanitizeWeekBlueprint(partial.weekBlueprint);
    const prev = sanitizeWeekBlueprint(
      current.weekBlueprint,
      suggestWeekBlueprintFromCatalog(),
    );
    if (!weekBlueprintEqual(next, prev)) return true;
  }
  if (
    partial.weekBlueprintCustomized != null &&
    partial.weekBlueprintCustomized !== current.weekBlueprintCustomized
  ) {
    return true;
  }
  if (
    partial.customBuildStyle != null &&
    partial.customBuildStyle !== current.customBuildStyle
  ) {
    return true;
  }
  return false;
}

export function weeklyCardioSettingsChanged(
  partial: Partial<UserSettings>,
  current: UserSettings,
): boolean {
  if (current.programMode === "custom") return false;
  if (partial.weeklyCardioByDay != null) {
    const next = sanitizeWeeklyCardioByDay(
      partial.weeklyCardioByDay,
      resolveWeeklyCardioByDay(current),
    );
    const prev = resolveWeeklyCardioByDay(current);
    if (!weeklyCardioEqual(next, prev)) return true;
  }
  if (
    partial.weeklyCardioCustomized != null &&
    partial.weeklyCardioCustomized !== current.weeklyCardioCustomized
  ) {
    return true;
  }
  return false;
}

export function weeklyPplScheduleSettingsChanged(
  partial: Partial<UserSettings>,
  current: UserSettings,
): boolean {
  if (!isPresetProgramMode(current.programMode)) return false;
  if (partial.weeklyPplSchedule != null) {
    const next = sanitizeWeeklyPplSchedule(
      partial.weeklyPplSchedule,
      resolveWeeklyPplSchedule(current),
    );
    const prev = resolveWeeklyPplSchedule(current);
    if (!weeklyPplScheduleEqual(next, prev)) return true;
  }
  if (
    partial.weeklyPplScheduleCustomized != null &&
    partial.weeklyPplScheduleCustomized !== current.weeklyPplScheduleCustomized
  ) {
    return true;
  }
  return false;
}

export function weeklyRestSettingsChanged(
  partial: Partial<UserSettings>,
  current: UserSettings,
): boolean {
  if (weeklyPplScheduleSettingsChanged(partial, current)) return true;
  if (current.programMode === "custom") {
    return false;
  }
  if (partial.weeklyRestDays != null) {
    const next = sanitizeWeeklyRestDays(partial.weeklyRestDays);
    const prev = sanitizeWeeklyRestDays(current.weeklyRestDays);
    for (let d = 0; d < 7; d++) {
      if ((next[d] ?? "workout") !== (prev[d] ?? "workout")) return true;
    }
  }
  if (
    partial.weeklyRestDaysCustomized != null &&
    partial.weeklyRestDaysCustomized !== current.weeklyRestDaysCustomized
  ) {
    return true;
  }
  return false;
}
