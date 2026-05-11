/**
 * Parse a MM:SS or M:SS string into total seconds.
 * Also handles plain numbers (treated as minutes).
 * Returns undefined if the input is empty or invalid.
 */
export function parseTimeInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;

  if (trimmed.includes(":")) {
    const [minStr, secStr] = trimmed.split(":");
    const mins = parseInt(minStr, 10);
    const secs = parseInt(secStr, 10);
    if (isNaN(mins) || isNaN(secs)) return undefined;
    return mins * 60 + Math.min(secs, 59);
  }

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
