import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import {
  collectDislikedIds,
  computePrefsFingerprint,
  isUserCustomizedWeekSource,
  materializeTrainingWeek,
  TRAINING_WEEK_SOURCE_GENERATED_V1,
  weekContainsDislikedExercise,
} from "@/lib/planGenerator";
import {
  getExercisePreferenceRepo,
  getSettingsRepo,
  getTrainingWeekRepo,
  type ExercisePreferenceMap,
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
  availableEquipment: ExerciseEquipment[];
  programFocus: ProgramFocusPreset;
  roundDensity: RoundDensity;
  fingerprint: string;
}> {
  const repoMode = repoModeForPlans(mode);
  const [prefs, settings] = await Promise.all([
    getExercisePreferenceRepo(repoMode).loadAll(),
    getSettingsRepo(repoMode).load(),
  ]);
  const { availableEquipment, programFocus, roundDensity } =
    settingsSlice(settings);
  return {
    prefs,
    settings,
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
): TrainingWeekDays {
  return materializeTrainingWeek(
    buildCatalogWeek(),
    prefs,
    availableEquipment,
    programFocus,
    roundDensity,
  );
}

function weekDaysComplete(days: TrainingWeekDays | null): days is TrainingWeekDays {
  if (!days) return false;
  for (let i = 0; i < 7; i++) {
    if (!days[i]) return false;
  }
  return true;
}

function weekNeedsMaterialization(
  stored: TrainingWeekDays | null,
  storedFingerprint: string | null,
  storedSource: string | null,
  currentFingerprint: string,
  dislikedIds: ReadonlySet<string>,
): boolean {
  if (isUserCustomizedWeekSource(storedSource)) return false;
  if (!weekDaysComplete(stored)) return true;
  if (storedFingerprint !== currentFingerprint) return true;
  if (weekContainsDislikedExercise(stored, dislikedIds)) return true;
  return false;
}

/** In-memory materialized week (guest / anonymous) from catalog + local settings. */
async function resolveMaterializedWeek(mode: AuthMode): Promise<TrainingWeekDays> {
  const { prefs, availableEquipment, programFocus, roundDensity } =
    await loadGeneratorInputs(mode);
  return materializeWeekFromCatalog(
    prefs,
    availableEquipment,
    programFocus,
    roundDensity,
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
    const materialized = materializeWeekFromCatalog(
      prefs,
      availableEquipment,
      programFocus,
      roundDensity,
    );
    await repo.saveSeededWeek(weekStartSundayKey, materialized, {
      source: TRAINING_WEEK_SOURCE_GENERATED_V1,
      prefsFingerprint: fingerprint,
    });
    return materialized;
  }

  if (!weekDaysComplete(storedDays)) {
    throw new Error("Persisted training week incomplete after materialization check");
  }
  return storedDays;
}

/**
 * Regenerate the Sun–Sat week containing `dateKey` from catalog + current generator inputs
 * (whole-week policy). Call after preference / profile changes; does not alter active workouts.
 */
export async function refreshTrainingWeekContaining(
  dateKey: string,
): Promise<void> {
  const weekKey = weekKeyFromDateKey(dateKey);
  if (!weekKey) return;
  const {
    prefs,
    availableEquipment,
    programFocus,
    roundDensity,
    fingerprint,
  } = await loadGeneratorInputs("authenticated");
  const materialized = materializeWeekFromCatalog(
    prefs,
    availableEquipment,
    programFocus,
    roundDensity,
  );
  await getTrainingWeekRepo("authenticated").saveSeededWeek(weekKey, materialized, {
    source: TRAINING_WEEK_SOURCE_GENERATED_V1,
    prefsFingerprint: fingerprint,
  });
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
