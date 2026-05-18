import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import {
  collectDislikedIds,
  computePrefsFingerprint,
  isUserCustomizedWeekSource,
  materializeTrainingWeek,
  TRAINING_WEEK_SOURCE_GENERATED_V1,
  weekDaysComplete,
  weekNeedsMaterialization,
} from "@/lib/planGenerator";
import {
  mergeRegeneratedDays,
  regenDayIndicesForPrefsChange,
} from "@/lib/trainingWeekRegen";
import { isWorkoutStartedForDate } from "@/lib/workoutSessionGuard";
import { formatLocalDateKey } from "@/utils/localDateKey";
import {
  getExercisePreferenceRepo,
  getExerciseSettingsRepo,
  getSettingsRepo,
  getTrainingWeekRepo,
  type ExercisePreferenceMap,
  type ExerciseSettingsMap,
  type TrainingWeekDays,
} from "@/lib/repos";
import type { AuthMode } from "@/stores/useAuthStore";
import type {
  DayPlan,
  ExerciseEquipment,
  ProgramFocusPreset,
  RoundDensity,
  UserSettings,
} from "@/types";
import {
  parseLocalDateKey,
  weekAnchorFromDateKey,
  weekKeyFromDateKey,
} from "@/utils/weekCalendar";

function settingsSlice(settings: UserSettings): {
  availableEquipment: ExerciseEquipment[];
  programFocus: ProgramFocusPreset;
  roundDensity: RoundDensity;
} {
  return {
    availableEquipment:
      settings.availableEquipment?.length > 0
        ? settings.availableEquipment
        : [...DEFAULT_AVAILABLE_EQUIPMENT],
    programFocus: settings.programFocus ?? "balanced",
    roundDensity: settings.roundDensity ?? "standard",
  };
}

function repoModeForPlans(mode: AuthMode): AuthMode {
  return mode === "authenticated" ? "authenticated" : "guest";
}

async function loadGeneratorInputs(mode: AuthMode): Promise<{
  prefs: ExercisePreferenceMap;
  settings: UserSettings;
  exerciseSettings: ExerciseSettingsMap;
  availableEquipment: ExerciseEquipment[];
  programFocus: ProgramFocusPreset;
  roundDensity: RoundDensity;
  fingerprint: string;
}> {
  const repoMode = repoModeForPlans(mode);
  const [prefs, settings, exerciseSettings] = await Promise.all([
    getExercisePreferenceRepo(repoMode).loadAll(),
    getSettingsRepo(repoMode).load(),
    getExerciseSettingsRepo(repoMode).loadAll(),
  ]);
  const { availableEquipment, programFocus, roundDensity } =
    settingsSlice(settings);
  return {
    prefs,
    settings,
    exerciseSettings,
    availableEquipment,
    programFocus,
    roundDensity,
    fingerprint: computePrefsFingerprint(
      prefs,
      availableEquipment,
      programFocus,
      roundDensity,
      settings.defaultWarmUp,
      settings.defaultCoolDown,
    ),
  };
}

function materializeWeekFromCatalog(
  prefs: ExercisePreferenceMap,
  availableEquipment: ExerciseEquipment[],
  programFocus: ProgramFocusPreset,
  roundDensity: RoundDensity,
  exerciseSettings: ExerciseSettingsMap,
): TrainingWeekDays {
  return materializeTrainingWeek(
    buildCatalogWeek(),
    prefs,
    availableEquipment,
    programFocus,
    roundDensity,
    exerciseSettings,
  );
}

export type RefreshTrainingWeekScope = "prefs" | "full";

function isWorkoutStartedToday(): boolean {
  return isWorkoutStartedForDate(formatLocalDateKey());
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

async function refreshPersistedWeek(
  weekKey: string,
  scope: RefreshTrainingWeekScope,
): Promise<TrainingWeekDays> {
  const {
    prefs,
    availableEquipment,
    programFocus,
    roundDensity,
    exerciseSettings,
    fingerprint,
  } = await loadGeneratorInputs("authenticated");

  const materialized = materializeWeekFromCatalog(
    prefs,
    availableEquipment,
    programFocus,
    roundDensity,
    exerciseSettings,
  );

  const repo = getTrainingWeekRepo("authenticated");
  const persisted = await repo.loadWeek(weekKey);
  const storedDays = persisted?.days ?? null;

  if (scope === "full" || !weekDaysComplete(storedDays)) {
    await persistTrainingWeek(weekKey, materialized, {
      source: TRAINING_WEEK_SOURCE_GENERATED_V1,
      prefsFingerprint: fingerprint,
    });
    return materialized;
  }

  const todayKey = formatLocalDateKey();
  const todayParsed = parseLocalDateKey(todayKey);
  const todayDow = todayParsed?.getDay() ?? 0;
  const indices = regenDayIndicesForPrefsChange({
    todayDayOfWeek: todayDow,
    workoutStartedToday: isWorkoutStartedToday(),
  });

  const merged =
    indices.length > 0
      ? mergeRegeneratedDays(storedDays, materialized, indices)
      : storedDays;

  const source =
    persisted?.source && isUserCustomizedWeekSource(persisted.source)
      ? persisted.source
      : TRAINING_WEEK_SOURCE_GENERATED_V1;

  await persistTrainingWeek(weekKey, merged, {
    source,
    prefsFingerprint: fingerprint,
  });
  return merged;
}

/** In-memory materialized week (guest / anonymous) from catalog + local settings. */
async function resolveMaterializedWeek(mode: AuthMode): Promise<TrainingWeekDays> {
  const { prefs, availableEquipment, programFocus, roundDensity, exerciseSettings } =
    await loadGeneratorInputs(mode);
  return materializeWeekFromCatalog(
    prefs,
    availableEquipment,
    programFocus,
    roundDensity,
    exerciseSettings,
  );
}

/** Load persisted week or materialize from catalog + profile + dislikes; persist when stale. */
async function loadOrSeedPersistedWeek(
  weekStartSundayKey: string,
): Promise<TrainingWeekDays> {
  const repo = getTrainingWeekRepo("authenticated");
  const {
    prefs,
    availableEquipment,
    programFocus,
    roundDensity,
    fingerprint,
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
    return refreshPersistedWeek(weekStartSundayKey, "prefs");
  }

  if (!weekDaysComplete(storedDays)) {
    throw new Error("Persisted training week incomplete after materialization check");
  }
  return storedDays;
}

/**
 * Regenerate days in the Sun–Sat week containing `dateKey`.
 * `prefs` — today (if no workout started) + future; past days and in-progress today are kept.
 * `full` — entire week from catalog (explicit reset).
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
  if (mode !== "authenticated") {
    return resolveMaterializedWeek(mode);
  }
  return loadOrSeedPersistedWeek(anchor.weekKey);
}

/**
 * Resolves the `DayPlan` for a local calendar day via the single plan resolver
 * (materialized week for guests; lazy-seeded DB week when signed in).
 */
export async function resolveDayPlanForAuth(
  dateKey: string,
  mode: AuthMode,
): Promise<DayPlan> {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) {
    throw new Error("Invalid date key");
  }
  const dow = parsed.getDay();
  const days = await resolveTrainingWeekForAuth(dateKey, mode);
  const plan = days[dow];
  if (!plan) {
    throw new Error(`No plan for dayOfWeek ${dow}`);
  }
  return plan;
}
