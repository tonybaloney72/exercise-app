import { formatLocalDateKey, parseLocalDateKey } from "@/utils/localDateKey";

/** Sunday 00:00:00 local for the week containing `ref`. */
export function getSundayOfWeekContaining(ref: Date = new Date()): Date {
  const start = new Date(ref);
  const dow = start.getDay();
  start.setDate(start.getDate() - dow);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getWeekDateKeys(ref: Date = new Date()): string[] {
  const sun = getSundayOfWeekContaining(ref);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    return formatLocalDateKey(d);
  });
}

export function isDateKeyInCurrentCalendarWeek(
  dateKey: string,
  ref: Date = new Date(),
): boolean {
  const d = parseLocalDateKey(dateKey);
  if (!d) return false;
  const keys = new Set(getWeekDateKeys(ref));
  return keys.has(formatLocalDateKey(d));
}

export function compareDateKeyToToday(dateKey: string): "past" | "today" | "future" {
  const d = parseLocalDateKey(dateKey);
  if (!d) return "future";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = d.getTime();
  const tn = today.getTime();
  if (t < tn) return "past";
  if (t > tn) return "future";
  return "today";
}

/** Parsed local date and Sun `YYYY-MM-DD` week key for the week containing that day. */
export function weekAnchorFromDateKey(
  dateKey: string,
): { parsed: Date; weekKey: string } | null {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) return null;
  return {
    parsed,
    weekKey: formatLocalDateKey(getSundayOfWeekContaining(parsed)),
  };
}

/** Sun `YYYY-MM-DD` for the calendar week containing `dateKey`, or null if invalid. */
export function weekKeyFromDateKey(dateKey: string): string | null {
  return weekAnchorFromDateKey(dateKey)?.weekKey ?? null;
}
