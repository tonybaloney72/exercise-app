import {
  computePrefsFingerprint,
  TRAINING_WEEK_SOURCE_CUSTOM_V1,
} from "@/lib/planGenerator";
import { resolveStretchesForDay } from "@/lib/dayStretchPlan";
import { refreshTrainingWeekContaining, resolveTrainingWeekForAuth } from "@/lib/planResolver";
import { buildStretchResolveContext } from "@/lib/stretchResolveContext";
import {
  cloneStretchEntries,
  filterStretchesByDislikes,
  stretchListsEqual,
} from "@/lib/stretchDefaults";
import {
  getExercisePreferenceRepo,
  getSettingsRepo,
  getTrainingWeekRepo,
} from "@/lib/repos";
import type { DayPlan, StretchEntry } from "@/types";
import { weekAnchorFromDateKey } from "@/utils/weekCalendar";

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

/** Seed editor lists from resolved stretches (respects dislikes; matches day preview). */
export function prepareDayPlanForEditor(plan: DayPlan): DayPlan {
  const cloned = cloneDayPlan(plan);
  const ctx = buildStretchResolveContext();
  const resolved = resolveStretchesForDay(plan, ctx);

  const warmUp =
    plan.warmUp != null
      ? filterStretchesByDislikes(cloneStretchEntries(plan.warmUp), ctx.dislikedExerciseIds)
      : resolved.warmUp;

  const coolDown =
    plan.coolDown != null
      ? filterStretchesByDislikes(cloneStretchEntries(plan.coolDown), ctx.dislikedExerciseIds)
      : resolved.coolDown;

  return { ...cloned, warmUp, coolDown };
}

/** Strip legacy fields; only persist per-day stretch overrides when they differ from derived. */
export function dayPlanForCustomSave(plan: DayPlan): DayPlan {
  const ctx = buildStretchResolveContext();
  const { defaultWarmUp: _w, defaultCoolDown: _c, ...rest } = plan as DayPlan & {
    defaultWarmUp?: StretchEntry[];
    defaultCoolDown?: StretchEntry[];
  };

  const basePlan: DayPlan = { ...rest };
  const resolved = resolveStretchesForDay(basePlan, ctx);

  const warmUp =
    rest.warmUp != null &&
    !stretchListsEqual(
      filterStretchesByDislikes(rest.warmUp, ctx.dislikedExerciseIds),
      resolved.warmUp,
    )
      ? filterStretchesByDislikes(rest.warmUp, ctx.dislikedExerciseIds)
      : undefined;

  const coolDown =
    rest.coolDown != null &&
    !stretchListsEqual(
      filterStretchesByDislikes(rest.coolDown, ctx.dislikedExerciseIds),
      resolved.coolDown,
    )
      ? filterStretchesByDislikes(rest.coolDown, ctx.dislikedExerciseIds)
      : undefined;

  return {
    ...basePlan,
    warmUp,
    coolDown,
  };
}

/**
 * Persist one day's plan into the current Sun–Sat week (authenticated).
 * Marks the week as user-customized so prefs changes won't auto-overwrite until reset.
 */
export async function saveCustomDayPlan(
  dateKey: string,
  dayPlan: DayPlan,
): Promise<void> {
  const anchor = weekAnchorFromDateKey(dateKey);
  if (!anchor) {
    throw new Error("Invalid date key");
  }
  const { parsed, weekKey } = anchor;
  const dow = parsed.getDay();

  const week = await resolveTrainingWeekForAuth(dateKey, "authenticated");
  const toSave = dayPlanForCustomSave(dayPlan);
  const merged = {
    ...week,
    [dow]: { ...toSave, dayOfWeek: dow },
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
  const anchor = weekAnchorFromDateKey(dateKey);
  if (!anchor) return null;
  const { weekKey } = anchor;
  const row = await getTrainingWeekRepo("authenticated").loadWeek(weekKey);
  return row?.source ?? null;
}
