/**
 * Parse a MM:SS or M:SS string into total seconds.
 * Also handles numeric entry without `:` for mobile keyboards:
 * - `930` → 9:30 (M:SS)
 * - `1735` → 17:35 (MM:SS)
 * - `32` or `9.5` → minutes
 * Returns undefined if the input is empty or invalid.
 */
export function parseTimeInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;

  if (trimmed.includes(":")) {
    const [minStr, secStr = "0"] = trimmed.split(":");
    const mins = parseInt(minStr, 10);
    const secs = parseInt(secStr, 10);
    if (isNaN(mins) || isNaN(secs)) return undefined;
    return mins * 60 + Math.min(secs, 59);
  }

  // Mobile-friendly numeric keypad without ":" — e.g. 1735 → 17:35
  if (/^\d{4}$/.test(trimmed)) {
    const mins = parseInt(trimmed.slice(0, 2), 10);
    const secs = parseInt(trimmed.slice(2, 4), 10);
    if (secs > 59) return undefined;
    return mins * 60 + secs;
  }

  // Shorter durations without ":" — e.g. 930 → 9:30
  if (/^\d{3}$/.test(trimmed)) {
    const mins = parseInt(trimmed.slice(0, 1), 10);
    const secs = parseInt(trimmed.slice(1, 3), 10);
    if (secs > 59) return undefined;
    return mins * 60 + secs;
  }

  if (/^\d{5,}$/.test(trimmed)) return undefined;

  const num = parseFloat(trimmed);
  if (isNaN(num)) return undefined;
  return Math.round(num * 60);
}

/**
 * Format total seconds into a MM:SS display string.
 * Returns empty string if value is undefined.
 */
export function formatSecondsToMMSS(totalSeconds: number | undefined): string {
  if (totalSeconds == null) return "";
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** MM:SS for countdown / stopwatch UI (seconds is always defined). */
export function formatTimerDisplay(totalSeconds: number): string {
  return formatSecondsToMMSS(totalSeconds);
}

/** Milliseconds left until `endsAtMs` (0 at or after deadline). */
export function countdownRemainingMs(
  endsAtMs: number,
  nowMs: number = Date.now(),
): number {
  return Math.max(0, endsAtMs - nowMs);
}

/**
 * Countdown label seconds: show N while (N−1, N] seconds remain (ceiling).
 * Shows 0 only when `remainingMs` is 0.
 */
export function displayCountdownSeconds(remainingMs: number): number {
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 1000);
}

/** Ring fill: 1 at start, 0 when time is up (continuous, not per-tick steps). */
export function countdownRingProgress(
  remainingMs: number,
  totalSeconds: number,
): number {
  if (totalSeconds <= 0) return 0;
  const totalMs = totalSeconds * 1000;
  return Math.min(1, Math.max(0, remainingMs / totalMs));
}

/** Logged duration for display (MM:SS, or raw seconds if formatting fails). */
export function formatLoggedDuration(seconds: number | undefined | null): string {
  if (seconds == null) return "";
  return formatSecondsToMMSS(seconds) || `${seconds}s`;
}
