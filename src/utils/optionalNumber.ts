/** Returns the value when it is a finite number greater than zero. */
export function positiveNumber(
  value: number | null | undefined,
): number | undefined {
  return value != null && value > 0 ? value : undefined;
}
