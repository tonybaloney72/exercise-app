import {
  applyWeeklyCardioToDay,
  normalizeDayPlanCardio,
  sanitizeWeeklyCardioByDay,
  suggestWeeklyCardioFromCatalog,
  weeklyCardioEqual,
} from "@/lib/cardioActivities";
import {
  applyRestDayToPlan,
  resolveRestDayMode,
  sanitizeWeeklyRestDays,
} from "@/lib/restDays";
import type { TrainingWeekDays } from "@/lib/repos";
import type { DayPlan, ExerciseEquipment, UserSettings } from "@/types";

export function resolveWeeklyCardioByDay(
  settings: UserSettings,
): Record<number, import("@/types").CardioActivityKind[]> {
  const catalog = suggestWeeklyCardioFromCatalog();
  if (!settings.weeklyCardioCustomized) {
    return catalog;
  }
  return sanitizeWeeklyCardioByDay(settings.weeklyCardioByDay, catalog);
}

/** Apply settings rest + cardio before generator materialization. */
export function prepareCatalogDayForUser(
  plan: DayPlan,
  settings: UserSettings,
  availableEquipment: ExerciseEquipment[],
): DayPlan {
  const cardioKinds = resolveWeeklyCardioByDay(settings)[plan.dayOfWeek] ?? [];
  let next = applyWeeklyCardioToDay(plan, cardioKinds, availableEquipment);
  const restMode = resolveRestDayMode(plan.dayOfWeek, settings);
  next = applyRestDayToPlan(next, restMode);
  return normalizeDayPlanCardio(next);
}

export function prepareCatalogWeekForUser(
  catalogWeek: TrainingWeekDays,
  settings: UserSettings,
  availableEquipment: ExerciseEquipment[],
): TrainingWeekDays {
  const out: TrainingWeekDays = {};
  for (let i = 0; i < 7; i++) {
    const day = catalogWeek[i];
    if (!day) continue;
    out[i] = prepareCatalogDayForUser(day, settings, availableEquipment);
  }
  return out;
}

export function weeklyCardioSettingsChanged(
  partial: Partial<UserSettings>,
  current: UserSettings,
): boolean {
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

export function weeklyRestSettingsChanged(
  partial: Partial<UserSettings>,
  current: UserSettings,
): boolean {
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
