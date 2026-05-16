/**
 * Exercise ids to exclude when picking a same-category replacement for a round slot.
 */
export function buildRoundExcludeIds(options: {
  plannedExerciseId: string;
  slotIndex: number;
  slotExerciseIds: readonly string[];
  /** Also exclude the id at `slotIndex` (live swap / shuffle). */
  excludeEffectiveAtSlot?: boolean;
}): Set<string> {
  const exclude = new Set<string>([options.plannedExerciseId]);
  if (options.excludeEffectiveAtSlot) {
    const atSlot = options.slotExerciseIds[options.slotIndex];
    if (atSlot) exclude.add(atSlot);
  }
  options.slotExerciseIds.forEach((id, j) => {
    if (j === options.slotIndex) return;
    exclude.add(id);
  });
  return exclude;
}
