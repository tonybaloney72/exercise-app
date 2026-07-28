import { collectDislikedIds, getReplacementCandidates } from "@/lib/exerciseCandidates";
import { resolveExpertiseFilter } from "@/lib/expertiseLevels";
import type { UserSettings } from "@/types";
import { buildRoundExcludeIds } from "@/lib/roundExclude";
import type {
  Exercise,
  ExerciseCategory,
  ExerciseEquipment,
  ExerciseLog,
} from "@/types";

/** Effective movement id for this slot (substitute if set, else prescribed). */
export function effectiveExerciseId(log: ExerciseLog): string {
  return log.swappedWith ?? log.exerciseId;
}

export type SwapCandidatePrefs = {
  availableEquipment: ExerciseEquipment[];
  dislikedExerciseIds: ReadonlySet<string>;
  expertiseFilter?: ReturnType<typeof resolveExpertiseFilter>;
};

/**
 * Same-category alternatives for swapping. Excludes the prescribed exercise for
 * this slot, any exercise already used in the round, and disliked exercises.
 */
export function getSwapCandidates(
  planCategory: ExerciseCategory,
  plannedExerciseId: string,
  roundExercises: ExerciseLog[],
  slotIndex: number,
  prefs: SwapCandidatePrefs,
): Exercise[] {
  const exclude = buildRoundExcludeIds({
    plannedExerciseId,
    slotIndex,
    slotExerciseIds: roundExercises.map((e) => effectiveExerciseId(e)),
    excludeEffectiveAtSlot: true,
  });

  return getReplacementCandidates({
    category: planCategory,
    excludeExerciseIds: exclude,
    availableEquipment: prefs.availableEquipment,
    dislikedExerciseIds: prefs.dislikedExerciseIds,
    expertiseFilter: prefs.expertiseFilter,
  });
}

/**
 * Swap pool across training categories (UI + store validation).
 * Expertise is capped per candidate category, not the prescribed slot.
 */
export function getSwapCandidatesAllCategories(
  categories: readonly ExerciseCategory[],
  plannedExerciseId: string,
  roundExercises: ExerciseLog[],
  slotIndex: number,
  prefs: SwapCandidatePrefs,
): Exercise[] {
  const exclude = buildRoundExcludeIds({
    plannedExerciseId,
    slotIndex,
    slotExerciseIds: roundExercises.map((e) => effectiveExerciseId(e)),
    excludeEffectiveAtSlot: true,
  });

  const seen = new Set<string>();
  const merged: Exercise[] = [];
  for (const category of categories) {
    for (const exercise of getReplacementCandidates({
      category,
      excludeExerciseIds: exclude,
      availableEquipment: prefs.availableEquipment,
      dislikedExerciseIds: prefs.dislikedExerciseIds,
      expertiseFilter: prefs.expertiseFilter,
    })) {
      if (seen.has(exercise.id)) continue;
      seen.add(exercise.id);
      merged.push(exercise);
    }
  }
  return merged;
}

export type RoundExerciseIds = {
  roundNumber: number;
  exerciseIds: readonly string[];
};

/**
 * For each exercise id, round numbers **after** `currentRoundNumber` where it appears
 * (prescribed or swapped-in). Used to warn on in-workout swaps, not to block picks.
 */
export function laterRoundOccurrencesByExerciseId(
  rounds: readonly RoundExerciseIds[],
  currentRoundNumber: number,
): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const round of rounds) {
    if (round.roundNumber <= currentRoundNumber) continue;
    for (const id of round.exerciseIds) {
      const existing = map.get(id);
      if (existing) {
        if (!existing.includes(round.roundNumber)) {
          existing.push(round.roundNumber);
        }
      } else {
        map.set(id, [round.roundNumber]);
      }
    }
  }
  return map;
}

/** Short label for swap UI (e.g. "Also in Round 3" or "Also in Rounds 2 & 4"). */
export function formatLaterRoundWarning(roundNumbers: readonly number[]): string {
  if (roundNumbers.length === 0) return "";
  const sorted = [...roundNumbers].sort((a, b) => a - b);
  if (sorted.length === 1) {
    return `Also scheduled in Round ${sorted[0]}`;
  }
  if (sorted.length === 2) {
    return `Also scheduled in Rounds ${sorted[0]} & ${sorted[1]}`;
  }
  const last = sorted.pop()!;
  return `Also scheduled in Rounds ${sorted.join(", ")}, & ${last}`;
}

export function pickRandomSwap(candidates: Exercise[]): Exercise | null {
  if (candidates.length === 0) return null;
  const i = Math.floor(Math.random() * candidates.length);
  return candidates[i] ?? null;
}

/** Read equipment + dislikes from Zustand at call time (live workout / swap UI). */
export function swapCandidatePrefsFromStores(
  getEquipment: () => ExerciseEquipment[],
  getPreferenceMap: () => Parameters<typeof collectDislikedIds>[0],
  getSettings?: () => Pick<UserSettings, "expertiseByGroup">,
): SwapCandidatePrefs {
  const settings = getSettings?.();
  return {
    availableEquipment: getEquipment(),
    dislikedExerciseIds: collectDislikedIds(getPreferenceMap()),
    expertiseFilter: settings
      ? resolveExpertiseFilter(settings)
      : undefined,
  };
}
