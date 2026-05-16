import { exercises } from "@/data/exercises";
import { exerciseMatchesEquipment } from "@/data/equipment";
import type { ExercisePreferenceMap } from "@/lib/repos";
import type { TrainingWeekDays } from "@/lib/repos";
import type {
  DayPlan,
  Exercise,
  ExerciseCategory,
  ExerciseEquipment,
  RoundExercise,
} from "@/types";

export const TRAINING_WEEK_SOURCE_DISLIKES_V1 = "daily_plans_catalog_dislikes_v1";

/** Stable key for “regenerate week when inputs change” (Slice 3 — whole-week policy). */
export function computePrefsFingerprint(
  prefs: ExercisePreferenceMap,
  availableEquipment: ExerciseEquipment[],
): string {
  const disliked = Object.entries(prefs)
    .filter(([, v]) => v === "disliked")
    .map(([id]) => id)
    .sort();
  const equip = [...availableEquipment].sort();
  return `d:${disliked.join(",")}|e:${equip.join(",")}`;
}

export function collectDislikedIds(prefs: ExercisePreferenceMap): Set<string> {
  const out = new Set<string>();
  for (const [id, kind] of Object.entries(prefs)) {
    if (kind === "disliked") out.add(id);
  }
  return out;
}

/**
 * Same-category replacements for plan materialization and swap UI.
 * Excludes prescribed id, ids already used in the round, and disliked catalog entries.
 */
export function getReplacementCandidates(options: {
  category: ExerciseCategory;
  excludeExerciseIds: ReadonlySet<string>;
  availableEquipment: ExerciseEquipment[];
  dislikedExerciseIds?: ReadonlySet<string>;
}): Exercise[] {
  const { category, excludeExerciseIds, availableEquipment, dislikedExerciseIds } =
    options;

  return exercises.filter(
    (ex) =>
      ex.category === category &&
      !excludeExerciseIds.has(ex.id) &&
      !dislikedExerciseIds?.has(ex.id) &&
      exerciseMatchesEquipment(ex.equipment, availableEquipment),
  );
}

/** Deterministic pick for persisted plans (stable across devices once saved). */
export function pickDeterministicReplacement(candidates: Exercise[]): Exercise | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[0] ?? null;
}

function replaceSlotIfDisliked(
  slot: RoundExercise,
  usedInRound: Set<string>,
  dislikedIds: ReadonlySet<string>,
  availableEquipment: ExerciseEquipment[],
): RoundExercise {
  if (!dislikedIds.has(slot.exerciseId)) {
    usedInRound.add(slot.exerciseId);
    return slot;
  }

  const exclude = new Set(usedInRound);
  exclude.add(slot.exerciseId);

  const candidates = getReplacementCandidates({
    category: slot.category,
    excludeExerciseIds: exclude,
    availableEquipment,
    dislikedExerciseIds: dislikedIds,
  });

  const substitute = pickDeterministicReplacement(candidates);
  if (!substitute) {
    console.warn(
      "[planGenerator] No replacement for disliked exercise",
      slot.exerciseId,
      "in category",
      slot.category,
    );
    usedInRound.add(slot.exerciseId);
    return slot;
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
  if (dislikedIds.size === 0) {
    return plan;
  }

  return {
    ...plan,
    rounds: plan.rounds.map((round) => {
      const usedInRound = new Set<string>();
      return {
        ...round,
        exercises: round.exercises.map((slot) =>
          replaceSlotIfDisliked(slot, usedInRound, dislikedIds, availableEquipment),
        ),
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
