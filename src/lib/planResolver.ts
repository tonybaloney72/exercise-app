import { buildWeekSeedFromSettings } from "@/lib/weekSeed";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { loadGeneratorInputs } from "@/lib/planGeneratorInputs";
import { settingsHydrationKey } from "@/lib/settingsHydration";
import {
  isUserCustomizedWeekSource,
  materializeTrainingWeek,
  TRAINING_WEEK_SOURCE_CUSTOM_V1,
  TRAINING_WEEK_SOURCE_GENERATED_V1,
  weekDaysComplete,
  weekNeedsMaterialization,
} from "@/lib/planGenerator";
import { mergeWeekScheduleIntoStoredWeek } from "@/lib/customWeekPlan";
import {
  mergeRegeneratedDays,
  regenDayIndicesForPrefsChange,
} from "@/lib/trainingWeekRegen";
import { sanitizeProgramMode } from "@/lib/weeklyCategoryLayout";
import { stripPhantomRestDayRounds } from "@/lib/restDays";
import { getPrescribedPlanFreezeState } from "@/lib/planResolverFreezeState";
import { isPrescribedPlanFrozenFromState } from "@/lib/workoutSessionGuard";
import type { RefreshTrainingWeekScope } from "@/lib/trainingWeekRefreshScope";

export type { RefreshTrainingWeekScope } from "@/lib/trainingWeekRefreshScope";
import { formatLocalDateKey } from "@/utils/localDateKey";
import {
  getTrainingWeekRepo,
  type ExercisePreferenceMap,
  type ExerciseSettingsMap,
  type TrainingWeekDays,
} from "@/lib/repos";
import type { AuthMode } from "@/stores/useAuthStore";
import type {
  DayPlan,
  ExerciseEquipment,
  RoundDensity,
  TrainingPriorityPreset,
  UserSettings,
} from "@/types";
import {
  buildProgramProfileInput,
  buildProgramProfileInputFromSettings,
  type ProgramProfileInput,
} from "@/lib/programProfile";
import { buildVarietySeed, varietySeedForCurrentWeek } from "@/lib/planVariety";
import { shouldPreserveStoredCustomWeekOnPrefsRefresh } from "@/lib/weekPlanPreferences";
import { isGuidedCustomSettings } from "@/lib/weekBlueprintPolicy";
import {
  parseLocalDateKey,
  weekAnchorFromDateKey,
  weekKeyFromDateKey,
} from "@/utils/weekCalendar";

function normalizeWeekDays(days: TrainingWeekDays): TrainingWeekDays {
  const out: TrainingWeekDays = {};
  for (let dow = 0; dow < 7; dow++) {
    const day = days[dow];
    if (day) out[dow] = stripPhantomRestDayRounds(day);
  }
  return out;
}

function programProfileFromSettings(settings: UserSettings) {
  return buildProgramProfileInputFromSettings(settings);
}

function materializeWeekFromSeed(
  prefs: ExercisePreferenceMap,
  availableEquipment: ExerciseEquipment[],
  trainingPriorityPreset: TrainingPriorityPreset,
  roundDensity: RoundDensity,
  exerciseSettings: ExerciseSettingsMap,
  varietySeed: string,
  profile: ProgramProfileInput,
  settings: UserSettings,
): TrainingWeekDays {
  return materializeTrainingWeek(
    buildWeekSeedFromSettings(settings),
    prefs,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    exerciseSettings,
    varietySeed,
    profile,
    settings,
  );
}

async function prescribedPlanFreezeStateForRefresh(): Promise<
  ReturnType<typeof getPrescribedPlanFreezeState>
> {
  const base = getPrescribedPlanFreezeState();
  if (typeof window === "undefined") return base;
  try {
    const { useAuthStore } = await import("@/stores/useAuthStore");
    const { mode, user } = useAuthStore.getState();
    if (mode !== "authenticated") return base;
    const authKey = settingsHydrationKey(mode, user?.id);
    if (authKey && base.historyLoadedForAuthKey === authKey) {
      return base;
    }
    const { getWorkoutRepo } = await import("@/lib/repos");
    const history = await getWorkoutRepo(mode).loadHistory();
    return { ...base, workoutHistory: history };
  } catch {
    return base;
  }
}

async function isTodayPrescribedPlanFrozen(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const state = await prescribedPlanFreezeStateForRefresh();
  return isPrescribedPlanFrozenFromState(formatLocalDateKey(), state);
}

async function persistTrainingWeek(
  weekKey: string,
  days: TrainingWeekDays,
  options: {
    source: string;
    prefsFingerprint: string;
  },
): Promise<void> {
  await getTrainingWeekRepo("authenticated").saveSeededWeek(weekKey, days, {
    source: options.source,
    prefsFingerprint: options.prefsFingerprint,
  });
}

type PersistedWeekBundle = {
  days: TrainingWeekDays;
  source: string | null;
};

async function refreshPersistedWeek(
  weekKey: string,
  scope: RefreshTrainingWeekScope,
): Promise<PersistedWeekBundle> {
  const {
    prefs,
    settings,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    exerciseSettings,
    fingerprint,
  } = await loadGeneratorInputs("authenticated");

  const programMode = sanitizeProgramMode(settings.programMode);
  const isCustomProgram = programMode === "custom";
  const effectiveScope = isGuidedCustomSettings(settings) ? "full" : scope;

  const profile = programProfileFromSettings(settings);
  const materialized = materializeWeekFromSeed(
    prefs,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    exerciseSettings,
    buildVarietySeed(weekKey, "authenticated"),
    profile,
    settings,
  );

  const repo = getTrainingWeekRepo("authenticated");
  const persisted = await repo.loadWeek(weekKey);
  const storedDays = persisted?.days ?? null;

  if (effectiveScope === "full" || !weekDaysComplete(storedDays)) {
    const source = isCustomProgram
      ? TRAINING_WEEK_SOURCE_CUSTOM_V1
      : TRAINING_WEEK_SOURCE_GENERATED_V1;
    await persistTrainingWeek(weekKey, materialized, {
      source,
      prefsFingerprint: fingerprint,
    });
    return { days: materialized, source };
  }

  if (
    shouldPreserveStoredCustomWeekOnPrefsRefresh(
      settings,
      effectiveScope,
      weekDaysComplete(storedDays),
    )
  ) {
    await persistTrainingWeek(weekKey, storedDays, {
      source: TRAINING_WEEK_SOURCE_CUSTOM_V1,
      prefsFingerprint: fingerprint,
    });
    return { days: storedDays, source: TRAINING_WEEK_SOURCE_CUSTOM_V1 };
  }

  const todayKey = formatLocalDateKey();
  const todayParsed = parseLocalDateKey(todayKey);
  const todayDow = todayParsed?.getDay() ?? 0;
  const indices = regenDayIndicesForPrefsChange({
    todayDayOfWeek: todayDow,
    freezeTodayPlan: await isTodayPrescribedPlanFrozen(),
  });

  const merged =
    indices.length > 0
      ? mergeRegeneratedDays(storedDays, materialized, indices)
      : storedDays;

  const source = isCustomProgram
    ? TRAINING_WEEK_SOURCE_CUSTOM_V1
    : indices.length > 0
      ? TRAINING_WEEK_SOURCE_GENERATED_V1
      : persisted?.source && isUserCustomizedWeekSource(persisted.source)
        ? persisted.source
        : TRAINING_WEEK_SOURCE_GENERATED_V1;

  await persistTrainingWeek(weekKey, merged, {
    source,
    prefsFingerprint: fingerprint,
  });
  return { days: merged, source };
}

/** Update rest-day / cardio metadata on a custom week without clearing user-built rounds. */
export async function refreshCustomWeekSchedule(
  dateKey: string,
): Promise<void> {
  const weekKey = weekKeyFromDateKey(dateKey);
  if (!weekKey) return;

  const {
    prefs,
    settings,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    exerciseSettings,
    fingerprint,
  } = await loadGeneratorInputs("authenticated");

  if (sanitizeProgramMode(settings.programMode) !== "custom") {
    await refreshPersistedWeek(weekKey, "prefs");
    return;
  }

  const profile = programProfileFromSettings(settings);
  const shells = materializeWeekFromSeed(
    prefs,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    exerciseSettings,
    buildVarietySeed(weekKey, "authenticated"),
    profile,
    settings,
  );

  const repo = getTrainingWeekRepo("authenticated");
  const persisted = await repo.loadWeek(weekKey);
  const storedDays = persisted?.days ?? null;

  if (!weekDaysComplete(storedDays)) {
    await persistTrainingWeek(weekKey, shells, {
      source: TRAINING_WEEK_SOURCE_CUSTOM_V1,
      prefsFingerprint: fingerprint,
    });
    return;
  }

  const merged = mergeWeekScheduleIntoStoredWeek(storedDays, shells);
  await persistTrainingWeek(weekKey, merged, {
    source: TRAINING_WEEK_SOURCE_CUSTOM_V1,
    prefsFingerprint: fingerprint,
  });
}

/** In-memory materialized week (guest / anonymous) from catalog + local settings. */
async function resolveMaterializedWeek(
  mode: AuthMode,
): Promise<TrainingWeekDays> {
  const {
    prefs,
    settings,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    exerciseSettings,
  } = await loadGeneratorInputs(mode);
  const scope = mode === "authenticated" ? "authenticated" : "guest";
  return materializeWeekFromSeed(
    prefs,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    exerciseSettings,
    varietySeedForCurrentWeek(scope),
    programProfileFromSettings(settings),
    settings,
  );
}

/** Load persisted week or materialize from catalog + profile + dislikes; persist when stale. */
async function loadOrSeedPersistedWeek(
  weekStartSundayKey: string,
): Promise<PersistedWeekBundle> {
  const repo = getTrainingWeekRepo("authenticated");
  const {
    prefs,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    fingerprint,
    settings,
  } = await loadGeneratorInputs("authenticated");
  const dislikedIds = collectDislikedIds(prefs);

  const persisted = await repo.loadWeek(weekStartSundayKey);
  const storedDays = persisted?.days ?? null;

  if (
    weekNeedsMaterialization(
      storedDays,
      persisted?.prefsFingerprint ?? null,
      persisted?.source ?? null,
      fingerprint,
      dislikedIds,
    )
  ) {
    const scope =
      isGuidedCustomSettings(settings) &&
      storedDays != null &&
      weekDaysComplete(storedDays)
        ? "full"
        : "prefs";
    return refreshPersistedWeek(weekStartSundayKey, scope);
  }

  if (!weekDaysComplete(storedDays)) {
    throw new Error(
      "Persisted training week incomplete after materialization check",
    );
  }
  return { days: storedDays, source: persisted?.source ?? null };
}

export type ResolvedTrainingWeekBundle = {
  days: TrainingWeekDays;
  source: string | null;
};

/** Resolved week plus persisted `source` metadata (authenticated only). */
export async function resolveTrainingWeekBundleForAuth(
  anyDateKeyInWeek: string,
  mode: AuthMode,
): Promise<ResolvedTrainingWeekBundle> {
  const anchor = weekAnchorFromDateKey(anyDateKeyInWeek);
  if (!anchor) {
    throw new Error("Invalid date key");
  }
  if (mode !== "authenticated") {
    return {
      days: normalizeWeekDays(await resolveMaterializedWeek(mode)),
      source: null,
    };
  }
  const bundle = await loadOrSeedPersistedWeek(anchor.weekKey);
  return {
    days: normalizeWeekDays(bundle.days),
    source: bundle.source,
  };
}

/**
 * Regenerate days in the Sun–Sat week containing `dateKey`.
 * `prefs` - today (if no workout started) + future; past days and in-progress today are kept.
 * `full` - entire week from catalog (explicit reset).
 */
export async function refreshTrainingWeekContaining(
  dateKey: string,
  scope: RefreshTrainingWeekScope = "prefs",
): Promise<void> {
  const weekKey = weekKeyFromDateKey(dateKey);
  if (!weekKey) return;
  await refreshPersistedWeek(weekKey, scope);
}

/**
 * Full Sun–Sat `DayPlan` map (keys 0–6): materialized from catalog + settings for all modes;
 * authenticated users persist the same snapshot used by Today and weekly routes.
 */
export async function resolveTrainingWeekForAuth(
  anyDateKeyInWeek: string,
  mode: AuthMode,
): Promise<TrainingWeekDays> {
  const anchor = weekAnchorFromDateKey(anyDateKeyInWeek);
  if (!anchor) {
    throw new Error("Invalid date key");
  }
  const bundle = await resolveTrainingWeekBundleForAuth(anyDateKeyInWeek, mode);
  return bundle.days;
}
