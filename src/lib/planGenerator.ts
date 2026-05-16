import {
  collectDislikedIds,
  collectFavoriteIds,
  pickDislikeReplacement,
} from "@/lib/exerciseCandidates";
import { applyProgramProfileToWeek } from "@/lib/programProfile";
import type { ExercisePreferenceMap } from "@/lib/repos";
import type { TrainingWeekDays } from "@/lib/repos";
import type {
  DayPlan,
  ExerciseEquipment,
  ProgramFocusPreset,
  RoundDensity,
  RoundExercise,
} from "@/types";

export const TRAINING_WEEK_SOURCE_GENERATED_V1 = "generated_week_v1";

/** @deprecated Use {@link TRAINING_WEEK_SOURCE_GENERATED_V1}. */
export const TRAINING_WEEK_SOURCE_DISLIKES_V1 = TRAINING_WEEK_SOURCE_GENERATED_V1;

/** Stable key for “regenerate week when inputs change” (whole-week policy). */
export function computePrefsFingerprint(
  prefs: ExercisePreferenceMap,
  availableEquipment: ExerciseEquipment[],
  programFocus: ProgramFocusPreset = "balanced",
  roundDensity: RoundDensity = "standard",
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
  return `d:${disliked.join(",")}|fv:${favorites.join(",")}|e:${equip.join(",")}|pf:${programFocus}|rd:${roundDensity}`;
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
  return {
    exerciseId: substitute.id,
    category: slot.category,
    targetReps: substitute.defaultReps,
  };
}

/** Apply dislike replacements to a single day plan (immutable copy). */
export function applyDislikesToDayPlan(
  plan: DayPlan,
  prefs: ExercisePreferenceMap,
  availableEquipment: ExerciseEquipment[],
): DayPlan {
  const dislikedIds = collectDislikedIds(prefs);
  const favoriteIds = collectFavoriteIds(prefs);
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
): TrainingWeekDays {
  const out: TrainingWeekDays = {};
  for (let i = 0; i < 7; i++) {
    const day = week[i];
    if (!day) continue;
    out[i] = applyDislikesToDayPlan(day, prefs, availableEquipment);
  }
  return out;
}

/** Catalog week → program profile → dislike replacements (Slice 5 + 3). */
export function materializeTrainingWeek(
  catalogWeek: TrainingWeekDays,
  prefs: ExercisePreferenceMap,
  availableEquipment: ExerciseEquipment[],
  programFocus: ProgramFocusPreset,
  roundDensity: RoundDensity,
): TrainingWeekDays {
  const profiled = applyProgramProfileToWeek(
    catalogWeek,
    programFocus,
    roundDensity,
    availableEquipment,
    prefs,
  );
  return applyDislikesToWeek(profiled, prefs, availableEquipment);
}

export function weekContainsDislikedExercise(
  week: TrainingWeekDays,
  dislikedIds: ReadonlySet<string>,
): boolean {
  if (dislikedIds.size === 0) return false;
  for (let d = 0; d < 7; d++) {
    const plan = week[d];
    if (!plan) continue;
    for (const round of plan.rounds) {
      for (const ex of round.exercises) {
        if (dislikedIds.has(ex.exerciseId)) return true;
      }
    }
  }
  return false;
}
