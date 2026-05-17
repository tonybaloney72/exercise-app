import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import {
  computePrefsFingerprint,
  isUserCustomizedWeekSource,
  materializeTrainingWeek,
  TRAINING_WEEK_SOURCE_CUSTOM_V1,
  TRAINING_WEEK_SOURCE_GENERATED_V1,
} from "@/lib/planGenerator";
import { resolveStretchesForDay } from "@/lib/dayStretchPlan";
import { refreshTrainingWeekContaining, resolveTrainingWeekForAuth } from "@/lib/planResolver";
import { buildStretchResolveContext } from "@/lib/stretchResolveContext";
import {
  cloneStretchEntries,
  normalizeStretchList,
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
      ? normalizeStretchList(plan.warmUp, ctx.dislikedExerciseIds)
      : resolved.warmUp;

  const coolDown =
    plan.coolDown != null
      ? normalizeStretchList(plan.coolDown, ctx.dislikedExerciseIds)
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

  const normalizedWarm =
    rest.warmUp != null
      ? normalizeStretchList(rest.warmUp, ctx.dislikedExerciseIds)
      : null;
  const normalizedCool =
    rest.coolDown != null
      ? normalizeStretchList(rest.coolDown, ctx.dislikedExerciseIds)
      : null;

  const warmUp =
    normalizedWarm != null && !stretchListsEqual(normalizedWarm, resolved.warmUp)
      ? normalizedWarm
      : undefined;

  const coolDown =
    normalizedCool != null && !stretchListsEqual(normalizedCool, resolved.coolDown)
      ? normalizedCool
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

/**
 * Replace one day in the persisted week with a freshly generated plan for that
 * day-of-week. Other days in the week are unchanged.
 */
export async function resetDayToGenerated(dateKey: string): Promise<DayPlan> {
  const anchor = weekAnchorFromDateKey(dateKey);
  if (!anchor) {
    throw new Error("Invalid date key");
  }
  const { weekKey, parsed } = anchor;
  const dow = parsed.getDay();

  const [prefs, settings] = await Promise.all([
    getExercisePreferenceRepo("authenticated").loadAll(),
    getSettingsRepo("authenticated").load(),
  ]);
  const availableEquipment =
    settings.availableEquipment?.length > 0
      ? settings.availableEquipment
      : [...DEFAULT_AVAILABLE_EQUIPMENT];
  const programFocus = settings.programFocus ?? "balanced";
  const roundDensity = settings.roundDensity ?? "standard";

  const generated = materializeTrainingWeek(
    buildCatalogWeek(),
    prefs,
    availableEquipment,
    programFocus,
    roundDensity,
  );
  const freshDay: DayPlan = { ...generated[dow], dayOfWeek: dow };

  const week = await resolveTrainingWeekForAuth(dateKey, "authenticated");
  const merged = {
    ...week,
    [dow]: freshDay,
  };

  const fingerprint = computePrefsFingerprint(
    prefs,
    availableEquipment,
    programFocus,
    roundDensity,
    settings.defaultWarmUp,
    settings.defaultCoolDown,
  );

  const row = await getTrainingWeekRepo("authenticated").loadWeek(weekKey);
  const source = isUserCustomizedWeekSource(row?.source)
    ? TRAINING_WEEK_SOURCE_CUSTOM_V1
    : TRAINING_WEEK_SOURCE_GENERATED_V1;

  await getTrainingWeekRepo("authenticated").saveSeededWeek(weekKey, merged, {
    source,
    prefsFingerprint: fingerprint,
  });

  return freshDay;
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
