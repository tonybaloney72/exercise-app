export const DEFAULT_WARM_UP_STRETCH_COUNT = 4;
export const DEFAULT_COOL_DOWN_STRETCH_COUNT = 5;
export const MIN_STRETCH_COUNT_PER_DAY = 1;
export const MAX_STRETCH_COUNT_PER_DAY = 10;

/** @deprecated Use {@link DEFAULT_COOL_DOWN_STRETCH_COUNT}. */
export const COOL_DOWN_STRETCHES_PER_DAY = DEFAULT_COOL_DOWN_STRETCH_COUNT;

export function sanitizeStretchCount(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(
    MAX_STRETCH_COUNT_PER_DAY,
    Math.max(MIN_STRETCH_COUNT_PER_DAY, Math.round(value)),
  );
}

export function stretchCountsFingerprint(
  warmUpStretchCount: number,
  coolDownStretchCount: number,
): string {
  return `st:w${warmUpStretchCount}|c${coolDownStretchCount}`;
}
