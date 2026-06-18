const DIAGNOSTIC_LOG_UNLOCK_KEY = "myexercise-diagnostic-log-unlocked";
export const DIAGNOSTIC_UNLOCK_TAP_COUNT = 7;
export const DIAGNOSTIC_UNLOCK_TAP_WINDOW_MS = 3_000;
export const DIAGNOSTIC_UNLOCK_LONG_PRESS_MS = 2_500;

export function readDiagnosticLogUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DIAGNOSTIC_LOG_UNLOCK_KEY) === "1";
}

export function writeDiagnosticLogUnlocked(unlocked: boolean): void {
  if (typeof window === "undefined") return;
  if (unlocked) {
    localStorage.setItem(DIAGNOSTIC_LOG_UNLOCK_KEY, "1");
  } else {
    localStorage.removeItem(DIAGNOSTIC_LOG_UNLOCK_KEY);
  }
}

export function registerDiagnosticUnlockTap(
  previousTapTimestampsMs: number[],
  nowMs: number = Date.now(),
): { timestamps: number[]; triggered: boolean } {
  const timestamps = [...previousTapTimestampsMs, nowMs].filter(
    (t) => nowMs - t < DIAGNOSTIC_UNLOCK_TAP_WINDOW_MS,
  );
  return {
    timestamps,
    triggered: timestamps.length >= DIAGNOSTIC_UNLOCK_TAP_COUNT,
  };
}
