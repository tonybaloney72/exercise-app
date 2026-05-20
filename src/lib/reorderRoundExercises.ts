import type { RoundExercise } from "@/types";

/** Reorder exercises within a single round (immutable). */
export function reorderRoundExercises(
  exercises: RoundExercise[],
  fromIndex: number,
  toIndex: number,
): RoundExercise[] {
  if (fromIndex === toIndex) return exercises;
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= exercises.length ||
    toIndex >= exercises.length
  ) {
    return exercises;
  }
  const next = [...exercises];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function sortableSlotId(roundIndex: number, slotIndex: number, exerciseId: string): string {
  return `r${roundIndex}-s${slotIndex}-${exerciseId}`;
}
