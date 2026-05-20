import { describe, expect, it } from "vitest";
import {
  buildMonthCalendarGrid,
  calendarStatusForDate,
  completedDateKeysFromHistory,
  hrefForCalendarCell,
  monthKeyFromParts,
  shiftMonthKey,
} from "@/lib/workoutHistoryCalendar";

describe("workoutHistoryCalendar", () => {
  it("builds a Sun-aligned grid for May 2026", () => {
    const cells = buildMonthCalendarGrid(2026, 4, new Set(["2026-05-15"]), "2026-05-18");
    expect(cells[0]!.status).toBe("outside");
    const may1 = cells.find((c) => c.dateKey === "2026-05-01");
    expect(may1?.dayOfMonth).toBe(1);
    expect(cells.length % 7).toBe(0);
  });

  it("classifies completed, missed, and today", () => {
    const done = new Set(["2026-05-10"]);
    expect(calendarStatusForDate("2026-05-10", done, "2026-05-18")).toBe("completed");
    expect(calendarStatusForDate("2026-05-01", done, "2026-05-18")).toBe("past-missed");
    expect(calendarStatusForDate("2026-05-18", done, "2026-05-18")).toBe("today");
    expect(calendarStatusForDate("2026-05-18", new Set(["2026-05-18"]), "2026-05-18")).toBe(
      "today-completed",
    );
  });

  it("shifts month keys", () => {
    expect(shiftMonthKey("2026-05", 1)).toBe("2026-06");
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
  });

  it("maps hrefs for tappable cells", () => {
    expect(
      hrefForCalendarCell({
        dateKey: "2026-05-10",
        dayOfMonth: 10,
        status: "completed",
      }),
    ).toBe("/progress/history/2026-05-10");
    expect(
      hrefForCalendarCell({
        dateKey: "2026-05-18",
        dayOfMonth: 18,
        status: "today",
      }),
    ).toBe("/today");
  });

  it("collects completed date keys", () => {
    const keys = completedDateKeysFromHistory([
      { date: "2026-05-01", endTime: "x" },
      { date: "2026-05-02", endTime: null },
    ]);
    expect([...keys]).toEqual(["2026-05-01"]);
  });

  it("formats month key", () => {
    expect(monthKeyFromParts(2026, 4)).toBe("2026-05");
  });
});
