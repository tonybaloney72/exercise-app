import { getPlanForDay } from "@/data/dailyPlans";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import {
  applyDislikesToWeek,
  collectDislikedIds,
  computePrefsFingerprint,
  TRAINING_WEEK_SOURCE_DISLIKES_V1,
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
import type { DayPlan, ExerciseEquipment } from "@/types";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { getSundayOfWeekContaining, parseLocalDateKey } from "@/utils/weekCalendar";

function buildCatalogWeek(): TrainingWeekDays {
  const out: TrainingWeekDays = {};
  for (let i = 0; i < 7; i++) {
    out[i] = getPlanForDay(i);
  }
  return out;
}

async function loadGeneratorInputs(): Promise<{
  prefs: ExercisePreferenceMap;
  availableEquipment: ExerciseEquipment[];
  fingerprint: string;
}> {
  const [prefs, settings] = await Promise.all([
    getExercisePreferenceRepo("authenticated").loadAll(),
    getSettingsRepo("authenticated").load(),
  ]);
  const availableEquipment =
    settings.availableEquipment?.length > 0
      ? settings.availableEquipment
      : [...DEFAULT_AVAILABLE_EQUIPMENT];
  return {
    prefs,
    availableEquipment,
    fingerprint: computePrefsFingerprint(prefs, availableEquipment),
  };
}

function materializeWeekFromCatalog(
  prefs: ExercisePreferenceMap,
  availableEquipment: ExerciseEquipment[],
): TrainingWeekDays {
  return applyDislikesToWeek(buildCatalogWeek(), prefs, availableEquipment);
}

function weekNeedsMaterialization(
  stored: TrainingWeekDays | null,
  storedFingerprint: string | null,
  currentFingerprint: string,
  dislikedIds: ReadonlySet<string>,
): boolean {
  if (!stored) return true;
  if (storedFingerprint !== currentFingerprint) return true;
  if (weekContainsDislikedExercise(stored, dislikedIds)) return true;
  return false;
}

/** Load persisted week or materialize from catalog + dislikes; persist when stale. */
async function loadOrSeedPersistedWeek(
  weekStartSundayKey: string,
): Promise<TrainingWeekDays> {
  const repo = getTrainingWeekRepo("authenticated");
  const { prefs, availableEquipment, fingerprint } = await loadGeneratorInputs();
  const dislikedIds = collectDislikedIds(prefs);

  const persisted = await repo.loadWeek(weekStartSundayKey);
  const storedDays = persisted?.days ?? null;

  if (
    weekNeedsMaterialization(
      storedDays,
      persisted?.prefsFingerprint ?? null,
      fingerprint,
      dislikedIds,
    )
  ) {
    const materialized = materializeWeekFromCatalog(prefs, availableEquipment);
    await repo.saveSeededWeek(weekStartSundayKey, materialized, {
      source: TRAINING_WEEK_SOURCE_DISLIKES_V1,
      prefsFingerprint: fingerprint,
    });
    return materialized;
  }

  const fallback = buildCatalogWeek();
  const merged: TrainingWeekDays = { ...fallback };
  if (storedDays) {
    for (let i = 0; i < 7; i++) {
      if (storedDays[i]) merged[i] = storedDays[i];
    }
  }
  return merged;
}

/**
 * Regenerate the Sun–Sat week containing `dateKey` from catalog + current dislikes
 * (whole-week policy — Slice 3). Call after preference changes; does not alter active workouts.
 */
export async function refreshTrainingWeekContaining(
  dateKey: string,
): Promise<void> {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) return;
  const sun = getSundayOfWeekContaining(parsed);
  const weekKey = formatLocalDateKey(sun);
  const { prefs, availableEquipment, fingerprint } = await loadGeneratorInputs();
  const materialized = materializeWeekFromCatalog(prefs, availableEquipment);
  await getTrainingWeekRepo("authenticated").saveSeededWeek(weekKey, materialized, {
    source: TRAINING_WEEK_SOURCE_DISLIKES_V1,
    prefsFingerprint: fingerprint,
  });
}

/**
 * Full Sun–Sat `DayPlan` map (keys 0–6): guests use the static catalog; authenticated users
 * use the same lazy-seeded row as `/today` and `/weekly/day/[date]` (any `YYYY-MM-DD` in the week).
 */
export async function resolveTrainingWeekForAuth(
  anyDateKeyInWeek: string,
  mode: AuthMode,
): Promise<TrainingWeekDays> {
  const parsed = parseLocalDateKey(anyDateKeyInWeek);
  if (!parsed) {
    throw new Error("Invalid date key");
  }
  if (mode !== "authenticated") {
    return buildCatalogWeek();
  }
  const sun = getSundayOfWeekContaining(parsed);
  const weekKey = formatLocalDateKey(sun);
  return loadOrSeedPersistedWeek(weekKey);
}

/**
 * Resolves the `DayPlan` for a local calendar day: guests use catalog only;
 * authenticated users lazy-seed the current Sun–Sat week into `user_training_weeks`.
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

  if (mode !== "authenticated") {
    return getPlanForDay(dow);
  }

  const sun = getSundayOfWeekContaining(parsed);
  const weekKey = formatLocalDateKey(sun);
  const days = await loadOrSeedPersistedWeek(weekKey);
  return days[dow] ?? getPlanForDay(dow);
}
