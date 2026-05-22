import {
  collectDislikedIds,
  collectFavoriteIds,
  pickDislikeReplacement,
} from "@/lib/exerciseCandidates";
import {
  DEFAULT_EXPERTISE_BY_GROUP,
  expertiseByGroupFingerprint,
  resolveExpertiseFilter,
} from "@/lib/expertiseLevels";
import { stretchDefaultsFingerprint } from "@/lib/stretchDefaults";
import type { StretchEntry } from "@/types";
import { applyProgramProfileToWeek } from "@/lib/programProfile";
import { dayPlanContainsDislikedExercise } from "@/lib/trainingWeekFrozenDay";
import type { ExercisePreferenceMap, ExerciseSettingsMap } from "@/lib/repos";
import type { TrainingWeekDays } from "@/lib/repos";
import { exerciseMap } from "@/data/exercises";
import { formatPlanTargetPrescription } from "@/utils/effectiveExerciseSettings";
import {
  buildProgramProfileInput,
  type ProgramProfileInput,
} from "@/lib/programProfile";
import {
  resolveTrainingPriorityScores,
  trainingPriorityFingerprint,
  type TrainingPriorityScores,
} from "@/lib/trainingPriorities";
import {
  resolveWeeklyCategoryLayout,
  sanitizeProgramMode,
  weeklyCategoryLayoutFingerprint,
  type ProgramMode,
  type WeeklyCategoryLayout,
} from "@/lib/weeklyCategoryLayout";
import { prepareCatalogWeekForUser } from "@/lib/weekPlanPreferences";
import type {
  DayPlan,
  ExerciseEquipment,
  RoundDensity,
  RoundExercise,
  TrainingPriorityPreset,
  UserSettings,
} from "@/types";

export const TRAINING_WEEK_SOURCE_GENERATED_V1 = "generated_week_v1";

/** User-edited week snapshot (Custom workouts v0); skips auto-regen until reset. */
export const TRAINING_WEEK_SOURCE_CUSTOM_V1 = "custom_week_v1";

/** @deprecated Use {@link TRAINING_WEEK_SOURCE_GENERATED_V1}. */
export const TRAINING_WEEK_SOURCE_DISLIKES_V1 = TRAINING_WEEK_SOURCE_GENERATED_V1;

export function isUserCustomizedWeekSource(source: string | null | undefined): boolean {
  return source === TRAINING_WEEK_SOURCE_CUSTOM_V1;
}

/** Stable key for “regenerate week when inputs change” (whole-week policy). */
export function computePrefsFingerprint(
  prefs: ExercisePreferenceMap,
  availableEquipment: ExerciseEquipment[],
  trainingPriorityPreset: TrainingPriorityPreset = "balanced",
  roundDensity: RoundDensity = "standard",
  defaultWarmUp: StretchEntry[] = [],
  defaultCoolDown: StretchEntry[] = [],
  trainingPriorityScores?: TrainingPriorityScores,
  trainingPriorityCustomized = false,
  programMode: ProgramMode = "priorities",
  weeklyCategoryLayout?: WeeklyCategoryLayout,
  weeklyCategoryLayoutCustomized = false,
  weeklyRestDays?: UserSettings["weeklyRestDays"],
  weeklyRestDaysCustomized = false,
  weeklyCardioByDay?: UserSettings["weeklyCardioByDay"],
  weeklyCardioCustomized = false,
  expertiseByGroup?: UserSettings["expertiseByGroup"],
): string {
  const disliked = Object.entries(prefs)
    .filter(([, v]) => v === "disliked")
    .map(([id]) => id)
    .sort();
  const favorites = Object.entries(prefs)
    .filter(([, v]) => v === "favorite")
    .map(([id]) => id)
    .sort();
  const equip = [...availableEquipment].sort();
  const stretches = stretchDefaultsFingerprint(defaultWarmUp, defaultCoolDown);
  const scores =
    trainingPriorityScores ??
    resolveTrainingPriorityScores({ trainingPriorityPreset });
  const mode = sanitizeProgramMode(programMode);
  const layoutSeg =
    mode === "layout"
      ? weeklyCategoryLayoutFingerprint(
          weeklyCategoryLayout ??
            resolveWeeklyCategoryLayout({
              weeklyCategoryLayout,
              weeklyCategoryLayoutCustomized,
            }),
        )
      : "wcl:default";
  const prioritySeg =
    mode === "priorities"
      ? trainingPriorityFingerprint(
          trainingPriorityPreset,
          scores,
          trainingPriorityCustomized,
        )
      : "tp:layout";
  const restSeg = weeklyRestDaysCustomized
    ? `wrd:${[0, 1, 2, 3, 4, 5, 6].map((d) => `${d}:${weeklyRestDays?.[d] ?? "workout"}`).join(",")}`
    : "wrd:default";
  const cardioSeg = weeklyCardioCustomized
    ? `wc:${[0, 1, 2, 3, 4, 5, 6].map((d) => `${d}:${(weeklyCardioByDay?.[d] ?? []).join("+") || "-"}`).join(",")}`
    : "wc:default";
  const expertiseSeg = `exp:${expertiseByGroupFingerprint(
    expertiseByGroup ?? DEFAULT_EXPERTISE_BY_GROUP,
  )}`;
  return `d:${disliked.join(",")}|fv:${favorites.join(",")}|e:${equip.join(",")}|pm:${mode}|${prioritySeg}|${layoutSeg}|rd:${roundDensity}|${restSeg}|${cardioSeg}|${expertiseSeg}|${stretches}`;
}

export function computePrefsFingerprintFromSettings(
  prefs: ExercisePreferenceMap,
  settings: UserSettings,
): string {
  return computePrefsFingerprint(
    prefs,
    settings.availableEquipment,
    settings.trainingPriorityPreset,
    settings.roundDensity,
    settings.defaultWarmUp,
    settings.defaultCoolDown,
    resolveTrainingPriorityScores(settings),
    settings.trainingPriorityCustomized ?? false,
    settings.programMode ?? "priorities",
    settings.weeklyCategoryLayout,
    settings.weeklyCategoryLayoutCustomized ?? false,
    settings.weeklyRestDays,
    settings.weeklyRestDaysCustomized ?? false,
    settings.weeklyCardioByDay,
    settings.weeklyCardioCustomized ?? false,
    settings.expertiseByGroup,
  );
}

export {
  collectDislikedIds,
  collectFavoriteIds,
  getReplacementCandidates,
  pickDeterministicReplacement,
  pickDislikeReplacement,
  pickReplacementCandidate,
} from "@/lib/exerciseCandidates";

function replaceSlotIfDisliked(
  slot: RoundExercise,
  usedInRound: Set<string>,
  dislikedIds: ReadonlySet<string>,
  favoriteIds: ReadonlySet<string>,
  availableEquipment: ExerciseEquipment[],
  exerciseSettings?: ExerciseSettingsMap,
  expertiseFilter?: ReturnType<typeof resolveExpertiseFilter>,
): RoundExercise | null {
  if (!dislikedIds.has(slot.exerciseId)) {
    usedInRound.add(slot.exerciseId);
    return slot;
  }

  const exclude = new Set(usedInRound);
  exclude.add(slot.exerciseId);

  const substitute = pickDislikeReplacement({
    category: slot.category,
    excludeExerciseIds: exclude,
    availableEquipment,
    dislikedExerciseIds: dislikedIds,
    favoriteIds,
    seed: `dislike:${slot.exerciseId}`,
    expertiseFilter,
  });
  if (!substitute) {
    console.warn(
      "[planGenerator] No replacement for disliked exercise; omitting slot",
      slot.exerciseId,
      slot.category,
    );
    return null;
  }

  usedInRound.add(substitute.id);
  const meta = exerciseMap[substitute.id];
  const targetReps = meta
    ? formatPlanTargetPrescription(meta, exerciseSettings?.[substitute.id])
    : substitute.defaultReps;
  return {
    exerciseId: substitute.id,
    category: slot.category,
    targetReps,
  };
}

/** Apply dislike replacements to a single day plan (immutable copy). */
export function applyDislikesToDayPlan(
  plan: DayPlan,
  prefs: ExercisePreferenceMap,
  availableEquipment: ExerciseEquipment[],
  exerciseSettings?: ExerciseSettingsMap,
  userSettings?: UserSettings,
): DayPlan {
  const dislikedIds = collectDislikedIds(prefs);
  const favoriteIds = collectFavoriteIds(prefs);
  const expertiseFilter = userSettings
    ? resolveExpertiseFilter(userSettings)
    : undefined;
  if (dislikedIds.size === 0) {
    return plan;
  }

  return {
    ...plan,
    rounds: plan.rounds.map((round) => {
      const usedInRound = new Set<string>();
      return {
        ...round,
        exercises: round.exercises
          .map((slot) =>
            replaceSlotIfDisliked(
              slot,
              usedInRound,
              dislikedIds,
              favoriteIds,
              availableEquipment,
              exerciseSettings,
              expertiseFilter,
            ),
          )
          .filter((slot): slot is RoundExercise => slot != null),
      };
    }),
  };
}

export function applyDislikesToWeek(
  week: TrainingWeekDays,
  prefs: ExercisePreferenceMap,
  availableEquipment: ExerciseEquipment[],
  exerciseSettings?: ExerciseSettingsMap,
  userSettings?: UserSettings,
): TrainingWeekDays {
  const out: TrainingWeekDays = {};
  for (let i = 0; i < 7; i++) {
    const day = week[i];
    if (!day) continue;
    out[i] = applyDislikesToDayPlan(
      day,
      prefs,
      availableEquipment,
      exerciseSettings,
      userSettings,
    );
  }
  return out;
}

/** Catalog week → program profile → dislike replacements (Slice 5 + 3). */
export function materializeTrainingWeek(
  catalogWeek: TrainingWeekDays,
  prefs: ExercisePreferenceMap,
  availableEquipment: ExerciseEquipment[],
  trainingPriorityPreset: TrainingPriorityPreset,
  roundDensity: RoundDensity,
  exerciseSettings?: ExerciseSettingsMap,
  varietySeed?: string,
  profileInput?: ProgramProfileInput,
  userSettings?: UserSettings,
): TrainingWeekDays {
  const profile =
    profileInput ??
    buildProgramProfileInput(trainingPriorityPreset);
  const seedWeek = userSettings
    ? prepareCatalogWeekForUser(catalogWeek, userSettings, availableEquipment)
    : catalogWeek;
  const profiled = applyProgramProfileToWeek(
    seedWeek,
    trainingPriorityPreset,
    roundDensity,
    availableEquipment,
    prefs,
    exerciseSettings,
    varietySeed,
    profile,
    userSettings,
  );
  return applyDislikesToWeek(
    profiled,
    prefs,
    availableEquipment,
    exerciseSettings,
    userSettings,
  );
}

export function weekContainsDislikedExercise(
  week: TrainingWeekDays,
  dislikedIds: ReadonlySet<string>,
): boolean {
  if (dislikedIds.size === 0) return false;
  for (let d = 0; d < 7; d++) {
    const plan = week[d];
    if (!plan) continue;
    if (dayPlanContainsDislikedExercise(plan, dislikedIds)) return true;
  }
  return false;
}

export function weekDaysComplete(days: TrainingWeekDays | null): days is TrainingWeekDays {
  if (!days) return false;
  for (let i = 0; i < 7; i++) {
    if (!days[i]) return false;
  }
  return true;
}

/** Whether a stored week should be regenerated from catalog + current prefs. */
export function weekNeedsMaterialization(
  stored: TrainingWeekDays | null,
  storedFingerprint: string | null,
  _storedSource: string | null,
  currentFingerprint: string,
  dislikedIds: ReadonlySet<string>,
): boolean {
  if (!weekDaysComplete(stored)) return true;
  if (storedFingerprint !== currentFingerprint) return true;
  if (weekContainsDislikedExercise(stored, dislikedIds)) return true;
  return false;
}
