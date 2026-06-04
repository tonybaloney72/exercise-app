/** Seconds hint from prescription text (e.g. "30 sec", "20–30 sec each side"). */
export function parseTimerSecondsHint(prescription: string): number | undefined {
  const lower = prescription.toLowerCase();
  if (!lower.includes("sec")) return undefined;
  const nums = (prescription.match(/\d+/g) ?? [])
    .map((x) => parseInt(x, 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
  if (nums.length === 0) return undefined;
  return Math.min(999, Math.max(5, Math.max(...nums)));
}

/** Best single-number hint from catalog prescription text (e.g. "12", "8–10"). */
export function parseRepTargetHint(defaultReps: string): number | undefined {
  const nums = (defaultReps.match(/\d+/g) ?? [])
    .map((x) => parseInt(x, 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
  if (nums.length === 0) return undefined;
  return Math.min(999, Math.max(1, Math.max(...nums)));
}

/** When the user prefers timer mode but has not set a duration yet. */
export const DEFAULT_TIMER_SECONDS_FALLBACK = 45;
