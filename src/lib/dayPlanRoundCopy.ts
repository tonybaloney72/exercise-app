import { exerciseMap } from "@/data/exercises";
import {
  getReplacementCandidates,
  type ExpertiseFilter,
} from "@/lib/exerciseCandidates";
import { pickRandomSwap } from "@/lib/exerciseSwap";
import { MAX_DAY_ROUNDS } from "@/lib/dayRoundLimits";
import type {
  DayPlan,
  ExerciseCategory,
  ExerciseEquipment,
  Round,
  RoundExercise,
} from "@/types";

export type RoundCopyMode = "repeat" | "structure";

export type RoundCopyPrefs = {
  availableEquipment: ExerciseEquipment[];
  dislikedExerciseIds?: ReadonlySet<string>;
  expertiseFilter?: ExpertiseFilter | null;
};

export function cloneRoundExercisesExact(
  source: readonly RoundExercise[],
): RoundExercise[] {
  return source.map((e) => ({ ...e }));
}

function categoryForExerciseId(exerciseId: string): ExerciseCategory {
  return (exerciseMap[exerciseId]?.category ?? "CB") as ExerciseCategory;
}

/** Same slot categories; pick different exercises (equipment + dislikes respected). */
export function structureRoundExercises(
  source: readonly RoundExercise[],
  usedInDay: ReadonlySet<string>,
  prefs: RoundCopyPrefs,
): RoundExercise[] {
  const usedInRound = new Set<string>();
  const dayUsed = new Set(usedInDay);

  return source.map((slot) => {
    const category = slot.category ?? categoryForExerciseId(slot.exerciseId);
    const exclude = new Set([slot.exerciseId, ...dayUsed, ...usedInRound]);
    const candidates = getReplacementCandidates({
      category,
      excludeExerciseIds: exclude,
      availableEquipment: prefs.availableEquipment,
      dislikedExerciseIds: prefs.dislikedExerciseIds,
      expertiseFilter: prefs.expertiseFilter,
    });
    const pick = pickRandomSwap(candidates);
    const exerciseId = pick?.id ?? slot.exerciseId;
    const meta = exerciseMap[exerciseId];
    usedInRound.add(exerciseId);
    dayUsed.add(exerciseId);
    return {
      exerciseId,
      targetReps:
        pick?.defaultReps ?? slot.targetReps ?? meta?.defaultReps ?? "",
      category: (meta?.category ?? category) as ExerciseCategory,
    };
  });
}

function copyRoundExercisesFromSource(
  source: readonly RoundExercise[],
  mode: RoundCopyMode,
  usedInDay: ReadonlySet<string>,
  prefs: RoundCopyPrefs,
): RoundExercise[] {
  if (mode === "repeat") {
    return cloneRoundExercisesExact(source);
  }
  return structureRoundExercises(source, usedInDay, prefs);
}

function renumberDayPlanRounds(rounds: Round[]): Round[] {
  return rounds.map((round, index) => ({
    ...round,
    roundNumber: index + 1,
  }));
}

function usedExerciseIdsInDay(
  rounds: readonly Round[],
  skipRoundIndex?: number,
): Set<string> {
  const used = new Set<string>();
  rounds.forEach((round, index) => {
    if (index === skipRoundIndex) return;
    for (const ex of round.exercises) {
      used.add(ex.exerciseId);
    }
  });
  return used;
}

/** Insert an empty round at `insertAt` (0-based index). */
export function insertEmptyRoundInDayPlan(
  plan: DayPlan,
  insertAt: number,
): DayPlan {
  if (plan.rounds.length >= MAX_DAY_ROUNDS) return plan;
  const at = Math.max(0, Math.min(insertAt, plan.rounds.length));
  const rounds = [...plan.rounds];
  rounds.splice(at, 0, { roundNumber: at + 1, exercises: [] });
  return { ...plan, rounds: renumberDayPlanRounds(rounds) };
}

/** Insert a round at `insertAt`, copying from `sourceRoundIndex` (0-based). */
export function insertRoundInDayPlan(
  plan: DayPlan,
  insertAt: number,
  sourceRoundIndex: number,
  mode: RoundCopyMode,
  prefs: RoundCopyPrefs,
): DayPlan {
  if (plan.rounds.length >= MAX_DAY_ROUNDS) return plan;
  const source = plan.rounds[sourceRoundIndex];
  if (!source) return plan;

  const at = Math.max(0, Math.min(insertAt, plan.rounds.length));
  const usedInDay = usedExerciseIdsInDay(plan.rounds);
  const exercises = copyRoundExercisesFromSource(
    source.exercises,
    mode,
    usedInDay,
    prefs,
  );

  const rounds = [...plan.rounds];
  rounds.splice(at, 0, { roundNumber: at + 1, exercises });
  return { ...plan, rounds: renumberDayPlanRounds(rounds) };
}

/** Replace target round exercises with a copy from the prior round. */
export function applyRoundCopyFromPriorInDayPlan(
  plan: DayPlan,
  roundIndex: number,
  mode: RoundCopyMode,
  prefs: RoundCopyPrefs,
): DayPlan {
  const sourceIndex = roundIndex - 1;
  if (sourceIndex < 0) return plan;
  const source = plan.rounds[sourceIndex];
  if (!source) return plan;

  const usedInDay = usedExerciseIdsInDay(plan.rounds, roundIndex);
  const exercises = copyRoundExercisesFromSource(
    source.exercises,
    mode,
    usedInDay,
    prefs,
  );

  const rounds = plan.rounds.map((round, index) =>
    index === roundIndex ? { ...round, exercises } : round,
  );
  return { ...plan, rounds };
}
