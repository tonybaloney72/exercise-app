import { formatLocalDateKey } from "@/utils/localDateKey";
import { parseLocalDateKey } from "@/utils/weekCalendar";

/** Compare calendar keys (`YYYY-MM-DD`) to a reference day key. */
export function compareDateKeyToRef(
  dateKey: string,
  refKey: string,
): "past" | "today" | "future" {
  if (dateKey === refKey) return "today";
  return dateKey < refKey ? "past" : "future";
}

export const CALENDAR_WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type CalendarDayStatus =
  | "outside"
  | "completed"
  | "today"
  | "today-completed"
  | "past-missed"
  | "future";

export type CalendarDayCell = {
  dateKey: string | null;
  dayOfMonth: number | null;
  status: CalendarDayStatus;
};

export type MonthCalendarModel = {
  /** `YYYY-MM` */
  monthKey: string;
  label: string;
  cells: CalendarDayCell[];
};

export function monthKeyFromParts(year: number, monthIndex: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  return `${year}-${m}`;
}

export function parseMonthKey(monthKey: string): { year: number; monthIndex: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

export function shiftMonthKey(monthKey: string, delta: number): string | null {
  const parts = parseMonthKey(monthKey);
  if (!parts) return null;
  const d = new Date(parts.year, parts.monthIndex + delta, 1);
  return monthKeyFromParts(d.getFullYear(), d.getMonth());
}

export function calendarStatusForDate(
  dateKey: string,
  completedDateKeys: ReadonlySet<string>,
  todayKey: string = formatLocalDateKey(),
): CalendarDayStatus {
  const when = compareDateKeyToRef(dateKey, todayKey);
  const done = completedDateKeys.has(dateKey);
  if (when === "today") return done ? "today-completed" : "today";
  if (done) return "completed";
  if (when === "past") return "past-missed";
  return "future";
}

/** Sun–Sat grid for one calendar month (leading/trailing padding cells included). */
export function buildMonthCalendarGrid(
  year: number,
  monthIndex: number,
  completedDateKeys: ReadonlySet<string>,
  todayKey: string = formatLocalDateKey(),
): CalendarDayCell[] {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leading = first.getDay();
  const cells: CalendarDayCell[] = [];

  for (let i = 0; i < leading; i++) {
    cells.push({ dateKey: null, dayOfMonth: null, status: "outside" });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const dateKey = formatLocalDateKey(d);
    cells.push({
      dateKey,
      dayOfMonth: day,
      status: calendarStatusForDate(dateKey, completedDateKeys, todayKey),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ dateKey: null, dayOfMonth: null, status: "outside" });
  }

  return cells;
}

export function buildMonthCalendarModel(
  monthKey: string,
  completedDateKeys: ReadonlySet<string>,
  todayKey: string = formatLocalDateKey(),
): MonthCalendarModel | null {
  const parts = parseMonthKey(monthKey);
  if (!parts) return null;
  const sample = new Date(parts.year, parts.monthIndex, 1);
  return {
    monthKey,
    label: sample.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    cells: buildMonthCalendarGrid(
      parts.year,
      parts.monthIndex,
      completedDateKeys,
      todayKey,
    ),
  };
}

export function completedDateKeysFromHistory(
  history: readonly { date: string; endTime?: string | null }[],
): Set<string> {
  const keys = new Set<string>();
  for (const log of history) {
    if (log.endTime == null) continue;
    keys.add(log.date);
  }
  return keys;
}

export function hrefForCalendarCell(cell: CalendarDayCell): string | null {
  if (!cell.dateKey || cell.status === "outside" || cell.status === "future") {
    return null;
  }
  if (cell.status === "today") return "/today";
  if (
    cell.status === "completed" ||
    cell.status === "today-completed" ||
    cell.status === "past-missed"
  ) {
    return `/progress/history/${cell.dateKey}`;
  }
  return null;
}
