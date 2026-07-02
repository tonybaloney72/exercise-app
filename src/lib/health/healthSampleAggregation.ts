/** Sum positive sample values (for exercise-window distance/calorie samples). */
export function sumHealthSampleValues(
  samples: ReadonlyArray<{ value: number }>,
): number {
  return samples
    .map((sample) => sample.value)
    .filter((value) => Number.isFinite(value) && value > 0)
    .reduce((sum, value) => sum + value, 0);
}
