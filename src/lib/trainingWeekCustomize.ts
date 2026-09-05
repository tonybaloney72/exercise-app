import {
  buildWeekSeedForProgramMode,
  buildWeekSeedFromSettings,
} from "@/lib/weekSeed";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import {
  computePrefsFingerprintFromSettings,
  isUserCustomizedWeekSource,
  materializeTrainingWeek,
  TRAINING_WEEK_SOURCE_CUSTOM_V1,
  TRAINING_WEEK_SOURCE_GENERATED_V1,
} from "@/lib/planGenerator";
import {
  buildProgramProfileInput,
  buildProgramProfileInputFromSettings,
} from "@/lib/programProfile";
import { resolveStretchesForDay } from "@/lib/dayStretchPlan";
import { buildVarietySeed } from "@/lib/planVariety";
import {
  buildStretchResolveContextFromInputs,
  type StretchResolveContext,
} from "@/lib/stretchResolveContext";
import {
  applyLibraryTargetsToStretchEntries,
  cloneStretchEntries,
  hasStretchListOverride,
  normalizeStretchList,
} from "@/lib/stretchDefaults";
import {
  getExercisePreferenceRepo,
  getExerciseSettingsRepo,
  getSettingsRepo,
  getTrainingWeekRepo,
  type ExerciseSettingsMap,
  type TrainingWeekDays,
} from "@/lib/repos";
import type {
  DayPlan,
  ExerciseEquipment,
  TrainingPriorityPreset,
  RoundDensity,
  StretchEntry,
  UserSettings,
} from "@/types";
import type { ExercisePreferenceMap } from "@/lib/repos";
import { normalizeDayPlanCardio } from "@/lib/cardioActivities";
import { stripPhantomRestDayRounds } from "@/lib/restDays";
import { weekAnchorFromDateKey } from "@/utils/weekCalendar";
import { isManualCustomSettings } from "@/lib/weekBlueprintPolicy";
import {
  buildDayPlanFromBlueprint,
  buildWeekPlansFromBlueprint,
  resolveBlueprintForManualSeed,
} from "@/lib/manualWeekSeed";
import type { WeekBlueprintPresetId } from "@/lib/weekBlueprintPresets";
import type { WeekBlueprint } from "@/lib/weekBlueprint";

async function resolveTrainingWeekForAuthInCustomize(dateKey: string) {
  const { resolveTrainingWeekForAuth } = await import("@/lib/planResolver");
  return resolveTrainingWeekForAuth(dateKey, "authenticated");
}

async function refreshTrainingWeekContainingInCustomize(
  dateKeyInWeek: string,
  scope: "prefs" | "full",
  options?: { replaceCustomizedDays?: boolean },
): Promise<void> {
  const { refreshTrainingWeekContaining } = await import("@/lib/planResolver");
  await refreshTrainingWeekContaining(dateKeyInWeek, scope, options);
}
async function stretchContextFromRepos(): Promise<StretchResolveContext> {
  const [prefs, settings] = await Promise.all([
    getExercisePreferenceRepo("authenticated").loadAll(),
    getSettingsRepo("authenticated").load(),
  ]);
  return buildStretchResolveContextFromInputs({
    warmUpStretchCount: settings.warmUpStretchCount,
    coolDownStretchCount: settings.coolDownStretchCount,
    exercisePreferences: prefs,
  });
}

/** Persist blueprint-generated exercises as a manual custom week. */
export async function seedManualWeekFromBlueprint(
  dateKeyInWeek: string,
  blueprint: WeekBlueprint,
): Promise<TrainingWeekDays> {
  const anchor = weekAnchorFromDateKey(dateKeyInWeek);
  if (!anchor) {
    throw new Error("Invalid date key");
  }

  const { weekKey } = anchor;
  const rawWeek = await buildWeekPlansFromBlueprint(blueprint, weekKey);
  const stretchCtx = await stretchContextFromRepos();
  const exerciseSettings = await getExerciseSettingsRepo(
    "authenticated",
  ).loadAll();
  const week: TrainingWeekDays = {};
  for (let dow = 0; dow < 7; dow++) {
    const day = rawWeek[dow];
    if (!day) continue;
    week[dow] = prepareDayPlanForEditor(day, stretchCtx, exerciseSettings);
  }

  const [prefs, settings] = await Promise.all([
    getExercisePreferenceRepo("authenticated").loadAll(),
    getSettingsRepo("authenticated").load(),
  ]);
  const fingerprint = computePrefsFingerprintFromSettings(prefs, settings);

  await getTrainingWeekRepo("authenticated").saveSeededWeek(weekKey, week, {
    source: TRAINING_WEEK_SOURCE_CUSTOM_V1,
    prefsFingerprint: fingerprint,
  });

  return week;
}

/** Deep copy for editor draft state. */
export function cloneDayPlan(plan: DayPlan): DayPlan {
  return normalizeDayPlanCardio({
    ...plan,
    strengthFocus: [...plan.strengthFocus],
    coreGroups: [...plan.coreGroups],
    cardioActivities: plan.cardioActivities?.map((a) => ({ ...a })),
    rounds: plan.rounds.map((round) => ({
      ...round,
      exercises: round.exercises.map((ex) => ({ ...ex })),
    })),
    warmUp: plan.warmUp ? cloneStretchEntries(plan.warmUp) : undefined,
    coolDown: plan.coolDown ? cloneStretchEntries(plan.coolDown) : undefined,
  });
}

/** Seed editor lists from resolved stretches (respects dislikes; matches day preview). */
export function prepareDayPlanForEditor(
  plan: DayPlan,
  ctx: StretchResolveContext,
  exerciseSettings?: ExerciseSettingsMap | null,
): DayPlan {
  const cloned = cloneDayPlan(stripPhantomRestDayRounds(plan));
  const resolved = resolveStretchesForDay(plan, ctx);

  const warmUp = applyLibraryTargetsToStretchEntries(
    hasStretchListOverride(plan.warmUp)
      ? normalizeStretchList(plan.warmUp, ctx.dislikedExerciseIds)
      : resolved.warmUp,
    exerciseSettings,
  );

  const coolDown = applyLibraryTargetsToStretchEntries(
    hasStretchListOverride(plan.coolDown)
      ? normalizeStretchList(plan.coolDown, ctx.dislikedExerciseIds)
      : resolved.coolDown,
    exerciseSettings,
  );

  return { ...cloned, warmUp, coolDown };
}

/** Persist resolved stretch lists on each saved day plan. */
export function dayPlanForCustomSave(
  plan: DayPlan,
  ctx: StretchResolveContext,
): DayPlan {
  const {
    defaultWarmUp: _w,
    defaultCoolDown: _c,
    ...rest
  } = plan as DayPlan & {
    defaultWarmUp?: StretchEntry[];
    defaultCoolDown?: StretchEntry[];
  };

  const basePlan = stripPhantomRestDayRounds({ ...rest });
  const resolved = resolveStretchesForDay(basePlan, ctx);

  return normalizeDayPlanCardio({
    ...basePlan,
    warmUp: resolved.warmUp,
    coolDown: resolved.coolDown,
    planCustomized: true,
  });
}

/**
 * Persist one day's plan into the current Sun–Sat week (authenticated).
 * Marks the week as user-customized so prefs changes won't auto-overwrite until reset.
 */
export async function saveCustomDayPlan(
  dateKey: string,
  dayPlan: DayPlan,
): Promise<TrainingWeekDays> {
  const anchor = weekAnchorFromDateKey(dateKey);
  if (!anchor) {
    throw new Error("Invalid date key");
  }
  const { parsed, weekKey } = anchor;
  const dow = parsed.getDay();

  const stretchCtx = await stretchContextFromRepos();
  const week = await resolveTrainingWeekForAuthInCustomize(dateKey);
  const toSave = dayPlanForCustomSave(dayPlan, stretchCtx);
  const merged = {
    ...week,
    [dow]: { ...toSave, dayOfWeek: dow },
  };

  const [prefs, settings] = await Promise.all([
    getExercisePreferenceRepo("authenticated").loadAll(),
    getSettingsRepo("authenticated").load(),
  ]);
  const fingerprint = computePrefsFingerprintFromSettings(prefs, settings);

  await getTrainingWeekRepo("authenticated").saveSeededWeek(weekKey, merged, {
    source: TRAINING_WEEK_SOURCE_CUSTOM_V1,
    prefsFingerprint: fingerprint,
  });
  return merged;
}

/** Regenerate the week from catalog + generator and clear custom edits. */
export async function resetTrainingWeekToGenerated(
  dateKeyInWeek: string,
): Promise<void> {
  await refreshTrainingWeekContainingInCustomize(dateKeyInWeek, "full", {
    replaceCustomizedDays: true,
  });
}

/** Fresh catalog + generator plan for one day-of-week (no persistence). */
export function buildGeneratedDayPlan(
  dayOfWeek: number,
  prefs: ExercisePreferenceMap,
  availableEquipment: ExerciseEquipment[],
  trainingPriorityPreset: TrainingPriorityPreset,
  roundDensity: RoundDensity,
  exerciseSettings?: ExerciseSettingsMap,
  varietySeed?: string,
  profileInput?: ReturnType<typeof buildProgramProfileInput>,
  userSettings?: UserSettings,
): DayPlan {
  const profile =
    profileInput ??
    (userSettings
      ? buildProgramProfileInputFromSettings(userSettings)
      : buildProgramProfileInput(trainingPriorityPreset, undefined, false, {
          pplMode: true,
        }));
  const seedWeek = userSettings
    ? buildWeekSeedFromSettings(userSettings)
    : buildWeekSeedForProgramMode("preset");
  const generated = materializeTrainingWeek(
    seedWeek,
    prefs,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    exerciseSettings,
    varietySeed,
    profile,
    userSettings,
  );
  const day = generated[dayOfWeek];
  if (!day) {
    throw new Error(`No catalog day for dayOfWeek ${dayOfWeek}`);
  }
  return { ...day, dayOfWeek };
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

  const [prefs, settings, exerciseSettings] = await Promise.all([
    getExercisePreferenceRepo("authenticated").loadAll(),
    getSettingsRepo("authenticated").load(),
    getExerciseSettingsRepo("authenticated").loadAll(),
  ]);
  const availableEquipment =
    settings.availableEquipment?.length > 0
      ? settings.availableEquipment
      : [...DEFAULT_AVAILABLE_EQUIPMENT];
  const trainingPriorityPreset = settings.trainingPriorityPreset ?? "balanced";
  const roundDensity = settings.roundDensity ?? "standard";

  const profile = buildProgramProfileInputFromSettings(settings);
  const useBlueprintReset =
    isManualCustomSettings(settings) && settings.weekBlueprintCustomized;

  const stretchCtx = await stretchContextFromRepos();
  const freshDay = useBlueprintReset
    ? prepareDayPlanForEditor(
        await buildDayPlanFromBlueprint(
          dow,
          resolveBlueprintForManualSeed(settings),
          weekKey,
        ),
        stretchCtx,
        exerciseSettings,
      )
    : buildGeneratedDayPlan(
        dow,
        prefs,
        availableEquipment,
        trainingPriorityPreset,
        roundDensity,
        exerciseSettings,
        buildVarietySeed(weekKey, "authenticated"),
        profile,
        settings,
      );

  const week = await resolveTrainingWeekForAuthInCustomize(dateKey);
  const merged = {
    ...week,
    [dow]: freshDay,
  };

  const fingerprint = computePrefsFingerprintFromSettings(prefs, settings);

  const row = await getTrainingWeekRepo("authenticated").loadWeek(weekKey);
  const source =
    settings.programMode === "custom" || isUserCustomizedWeekSource(row?.source)
      ? TRAINING_WEEK_SOURCE_CUSTOM_V1
      : TRAINING_WEEK_SOURCE_GENERATED_V1;

  await getTrainingWeekRepo("authenticated").saveSeededWeek(weekKey, merged, {
    source,
    prefsFingerprint: fingerprint,
  });

  return freshDay;
}
