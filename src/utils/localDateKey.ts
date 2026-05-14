/**
 * Calendar date in the user's local timezone as `YYYY-MM-DD`.
 * Prefer this over `date.toISOString().split("T")[0]`, which uses UTC and can
 * shift the day for evening / morning workouts.
 */
export function formatLocalDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
