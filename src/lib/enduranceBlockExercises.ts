/** Cardio-block activities (jog, walk, etc.) — not strength round slots. */
export const ENDURANCE_BLOCK_EXERCISE_IDS = [
  "END-JOG",
  "END-WALK",
  "END-CYCLE",
  "END-HIKE",
  "END-SWIM",
] as const;

export function isEnduranceBlockExerciseId(id: string): boolean {
  return id.startsWith("END-");
}
