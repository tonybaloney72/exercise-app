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
import { isPrescribedPlanFrozenForDate } from "@/lib/workoutSessionGuard";
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
  TrainingPriorityPreset,
  RoundDensity,
  UserSettings,
} from "@/types";
import { buildProgramProfileInput } from "@/lib/programProfile";
import { buildVarietySeed, varietySeedForCurrentWeek } from "@/lib/planVariety";
import { resolveTrainingPriorityScores } from "@/lib/trainingPriorities";
import {
  parseLocalDateKey,
  weekAnchorFromDateKey,
  weekKeyFromDateKey,
} from "@/utils/weekCalendar";

function settingsSlice(settings: UserSettings): {
  availableEquipment: ExerciseEquipment[];
  trainingPriorityPreset: TrainingPriorityPreset;
  roundDensity: RoundDensity;
} {
  return {
    availableEquipment:
      settings.availableEquipment?.length > 0
        ? settings.availableEquipment
        : [...DEFAULT_AVAILABLE_EQUIPMENT],
    trainingPriorityPreset: settings.trainingPriorityPreset ?? "balanced",
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
  trainingPriorityPreset: TrainingPriorityPreset;
  roundDensity: RoundDensity;
  fingerprint: string;
}> {
  const repoMode = repoModeForPlans(mode);
  const [prefs, settings, exerciseSettings] = await Promise.all([
    getExercisePreferenceRepo(repoMode).loadAll(),
    getSettingsRepo(repoMode).load(),
    getExerciseSettingsRepo(repoMode).loadAll(),
  ]);
  const { availableEquipment, trainingPriorityPreset, roundDensity } =
    settingsSlice(settings);
  return {
    prefs,
    settings,
    exerciseSettings,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    fingerprint: computePrefsFingerprint(
      prefs,
      availableEquipment,
      trainingPriorityPreset,
      roundDensity,
      settings.defaultWarmUp,
      settings.defaultCoolDown,
      resolveTrainingPriorityScores(settings),
      settings.trainingPriorityCustomized ?? false,
    ),
  };
}

function programProfileFromSettings(settings: UserSettings) {
  const preset = settings.trainingPriorityPreset ?? "balanced";
  const scores = resolveTrainingPriorityScores(settings);
  return buildProgramProfileInput(
    preset,
    scores,
    settings.trainingPriorityCustomized ?? false,
  );
}

function materializeWeekFromCatalog(
  prefs: ExercisePreferenceMap,
  availableEquipment: ExerciseEquipment[],
  trainingPriorityPreset: TrainingPriorityPreset,
  roundDensity: RoundDensity,
  exerciseSettings: ExerciseSettingsMap,
  varietySeed: string,
  profile: ReturnType<typeof buildProgramProfileInput>,
): TrainingWeekDays {
  return materializeTrainingWeek(
    buildCatalogWeek(),
    prefs,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    exerciseSettings,
    varietySeed,
    profile,
  );
}

export type RefreshTrainingWeekScope = "prefs" | "full";

function isTodayPrescribedPlanFrozen(): boolean {
  return isPrescribedPlanFrozenForDate(formatLocalDateKey());
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
    settings,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    exerciseSettings,
    fingerprint,
  } = await loadGeneratorInputs("authenticated");

  const profile = programProfileFromSettings(settings);
  const materialized = materializeWeekFromCatalog(
    prefs,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    exerciseSettings,
    buildVarietySeed(weekKey, "authenticated"),
    profile,
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
    freezeTodayPlan: isTodayPrescribedPlanFrozen(),
  });

  const merged =
    indices.length > 0
      ? mergeRegeneratedDays(storedDays, materialized, indices)
      : storedDays;

  const source =
    indices.length > 0
      ? TRAINING_WEEK_SOURCE_GENERATED_V1
      : persisted?.source && isUserCustomizedWeekSource(persisted.source)
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
  const {
    prefs,
    settings,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    exerciseSettings,
  } = await loadGeneratorInputs(mode);
  const scope = mode === "authenticated" ? "authenticated" : "guest";
  return materializeWeekFromCatalog(
    prefs,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    exerciseSettings,
    varietySeedForCurrentWeek(scope),
    programProfileFromSettings(settings),
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
    trainingPriorityPreset,
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
