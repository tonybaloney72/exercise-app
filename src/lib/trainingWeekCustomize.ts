import {
  computePrefsFingerprint,
  TRAINING_WEEK_SOURCE_CUSTOM_V1,
} from "@/lib/planGenerator";
import { rebuildDerivedStretches } from "@/lib/dayStretchPlan";
import { refreshTrainingWeekContaining, resolveTrainingWeekForAuth } from "@/lib/planResolver";
import { buildStretchResolveContext } from "@/lib/stretchResolveContext";
import { cloneStretchEntries } from "@/lib/stretchDefaults";
import {
  getExercisePreferenceRepo,
  getSettingsRepo,
  getTrainingWeekRepo,
} from "@/lib/repos";
import type { DayPlan, StretchEntry } from "@/types";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { getSundayOfWeekContaining, parseLocalDateKey } from "@/utils/weekCalendar";

export { isUserCustomizedWeekSource } from "@/lib/planGenerator";

/** Deep copy for editor draft state. */
export function cloneDayPlan(plan: DayPlan): DayPlan {
  return {
    ...plan,
    strengthFocus: [...plan.strengthFocus],
    coreGroups: [...plan.coreGroups],
    rounds: plan.rounds.map((round) => ({
      ...round,
      exercises: round.exercises.map((ex) => ({ ...ex })),
    })),
    warmUp: plan.warmUp ? cloneStretchEntries(plan.warmUp) : undefined,
    coolDown: plan.coolDown ? cloneStretchEntries(plan.coolDown) : undefined,
  };
}

/** Seed editor with per-day stretch lists (defaults come from Settings). */
export function prepareDayPlanForEditor(plan: DayPlan): DayPlan {
  const cloned = cloneDayPlan(plan);
  const ctx = buildStretchResolveContext();
  const derived = rebuildDerivedStretches(plan, ctx);
  return {
    ...cloned,
    warmUp: plan.warmUp ? cloneStretchEntries(plan.warmUp) : cloneStretchEntries(derived.warmUp),
    coolDown: plan.coolDown
      ? cloneStretchEntries(plan.coolDown)
      : cloneStretchEntries(derived.coolDown),
  };
}

/** Strip legacy per-day default fields before persisting (now in Settings). */
export function dayPlanForCustomSave(plan: DayPlan): DayPlan {
  const { defaultWarmUp: _w, defaultCoolDown: _c, ...rest } = plan as DayPlan & {
    defaultWarmUp?: StretchEntry[];
    defaultCoolDown?: StretchEntry[];
  };
  return rest;
}

/**
 * Persist one day's plan into the current Sun–Sat week (authenticated).
 * Marks the week as user-customized so prefs changes won't auto-overwrite until reset.
 */
export async function saveCustomDayPlan(
  dateKey: string,
  dayPlan: DayPlan,
): Promise<void> {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) {
    throw new Error("Invalid date key");
  }

  const weekKey = formatLocalDateKey(getSundayOfWeekContaining(parsed));
  const dow = parsed.getDay();

  const week = await resolveTrainingWeekForAuth(dateKey, "authenticated");
  const merged = {
    ...week,
    [dow]: { ...dayPlanForCustomSave(dayPlan), dayOfWeek: dow },
  };

  const [prefs, settings] = await Promise.all([
    getExercisePreferenceRepo("authenticated").loadAll(),
    getSettingsRepo("authenticated").load(),
  ]);
  const fingerprint = computePrefsFingerprint(
    prefs,
    settings.availableEquipment,
    settings.programFocus,
    settings.roundDensity,
    settings.defaultWarmUp,
    settings.defaultCoolDown,
  );

  await getTrainingWeekRepo("authenticated").saveSeededWeek(weekKey, merged, {
    source: TRAINING_WEEK_SOURCE_CUSTOM_V1,
    prefsFingerprint: fingerprint,
  });
}

/** Regenerate the week from catalog + generator and clear custom edits. */
export async function resetTrainingWeekToGenerated(
  dateKeyInWeek: string,
): Promise<void> {
  await refreshTrainingWeekContaining(dateKeyInWeek);
}

export async function getWeekSourceForDate(
  dateKey: string,
): Promise<string | null> {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) return null;
  const weekKey = formatLocalDateKey(getSundayOfWeekContaining(parsed));
  const row = await getTrainingWeekRepo("authenticated").loadWeek(weekKey);
  return row?.source ?? null;
}
