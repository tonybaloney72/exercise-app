"use client";

import Link from "next/link";
import {
  CALENDAR_WEEKDAY_LABELS,
  hrefForCalendarCell,
  type CalendarDayCell,
  type MonthCalendarModel,
} from "@/lib/workoutHistoryCalendar";

function cellClassName(status: CalendarDayCell["status"]): string {
  const base =
    "flex aspect-square w-full flex-col items-center justify-center rounded-lg text-sm font-medium transition-colors";
  switch (status) {
    case "outside":
      return `${base} invisible pointer-events-none`;
    case "completed":
      return `${base} bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25`;
    case "today-completed":
      return `${base} bg-green-500/20 text-green-300 border-2 border-accent ring-1 ring-accent/30 hover:bg-green-500/30`;
    case "today":
      return `${base} border-2 border-accent bg-accent/10 text-accent hover:bg-accent/20`;
    case "past-missed":
      return `${base} border border-dashed border-border bg-surface/50 text-muted hover:border-muted hover:bg-surface-hover`;
    case "future":
      return `${base} text-muted/40 cursor-default`;
    default:
      return base;
  }
}

function CalendarDay({ cell }: { cell: CalendarDayCell }) {
  if (cell.status === "outside" || cell.dayOfMonth == null) {
    return <div className={cellClassName("outside")} aria-hidden />;
  }

  const href = hrefForCalendarCell(cell);
  const label =
    cell.status === "completed" || cell.status === "today-completed"
      ? `Completed workout on day ${cell.dayOfMonth}`
      : cell.status === "past-missed"
        ? `No workout logged on day ${cell.dayOfMonth}`
        : cell.status === "today"
          ? `Today, day ${cell.dayOfMonth}`
          : `Day ${cell.dayOfMonth}`;

  const inner = (
    <>
      <span className="tabular-nums">{cell.dayOfMonth}</span>
      {(cell.status === "completed" || cell.status === "today-completed") && (
        <span className="mt-0.5 h-1 w-1 rounded-full bg-green-400" aria-hidden />
      )}
    </>
  );

  if (!href) {
    return (
      <div className={cellClassName(cell.status)} aria-label={label}>
        {inner}
      </div>
    );
  }

  return (
    <Link href={href} className={cellClassName(cell.status)} aria-label={label}>
      {inner}
    </Link>
  );
}

type Props = {
  model: MonthCalendarModel;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoNext: boolean;
};

export default function WorkoutHistoryCalendar({
  model,
  onPrevMonth,
  onNextMonth,
  canGoNext,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrevMonth}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
          aria-label="Previous month"
        >
          ←
        </button>
        <h2 className="text-base font-semibold text-foreground">{model.label}</h2>
        <button
          type="button"
          onClick={onNextMonth}
          disabled={!canGoNext}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-40"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {CALENDAR_WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 text-[10px] font-semibold uppercase tracking-wide text-muted"
          >
            {label}
          </div>
        ))}
        {model.cells.map((cell, i) => (
          <CalendarDay key={cell.dateKey ?? `pad-${i}`} cell={cell} />
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted px-1">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-500/30 border border-green-500/40" />
          Completed
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-border" />
          No log
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border-2 border-accent" />
          Today
        </li>
      </ul>
    </div>
  );
}
