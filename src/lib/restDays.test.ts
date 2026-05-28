import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/repos/types";
import {
  applyRestDayToPlan,
  DEFAULT_WEEKLY_REST_DAYS,
  resolveRestDayMode,
  sanitizeWeeklyRestDays,
  stripPhantomRestDayRounds,
} from "@/lib/restDays";
import { getCatalogPlanForDay } from "@/data/trainingWeekCatalog";

describe("restDays", () => {
  it("migrates legacy off/light/full values", () => {
    const days = sanitizeWeeklyRestDays({
      0: "off",
      1: "light",
      2: "full",
    });
    expect(days[0]).toBe("workout");
    expect(days[1]).toBe("stretches");
    expect(days[2]).toBe("full_rest");
    expect(days[3]).toBe("workout");
  });

  it("defaults Sunday to active recovery before user customization (preset)", () => {
    expect(DEFAULT_WEEKLY_REST_DAYS[0]).toBe("active_recovery");
    const settings = {
      programMode: DEFAULT_SETTINGS.programMode,
      weeklyRestDays: DEFAULT_SETTINGS.weeklyRestDays,
      weeklyRestDaysCustomized: DEFAULT_SETTINGS.weeklyRestDaysCustomized,
      weeklyPplSchedule: DEFAULT_SETTINGS.weeklyPplSchedule,
      weeklyPplScheduleCustomized: DEFAULT_SETTINGS.weeklyPplScheduleCustomized,
    };
    expect(resolveRestDayMode(0, settings)).toBe("active_recovery");
    expect(resolveRestDayMode(1, settings)).toBe("workout");
  });

  it("weekly layout mode always uses workout (rest via empty groups)", () => {
    const settings = {
      programMode: "layout" as const,
      weeklyRestDays: { 0: "active_recovery" as const },
      weeklyRestDaysCustomized: true,
      weeklyPplSchedule: DEFAULT_SETTINGS.weeklyPplSchedule,
      weeklyPplScheduleCustomized: DEFAULT_SETTINGS.weeklyPplScheduleCustomized,
    };
    expect(resolveRestDayMode(0, settings)).toBe("workout");
  });

  it("applyRestDayToPlan full_rest removes all rounds", () => {
    const mon = getCatalogPlanForDay(1);
    const rested = applyRestDayToPlan(mon, "full_rest");
    expect(rested.rounds).toEqual([]);
    expect(rested.hasJog).toBe(false);
  });

  it("stripPhantomRestDayRounds removes legacy empty round shells", () => {
    const mon = getCatalogPlanForDay(1);
    const legacy = applyRestDayToPlan(mon, "full_rest");
    const phantom = {
      ...legacy,
      rounds: [{ roundNumber: 1, exercises: [] }],
    };
    const cleaned = stripPhantomRestDayRounds(phantom);
    expect(cleaned.rounds).toEqual([]);
    expect(cleaned.hasJog).toBe(false);
  });

  it("stripPhantomRestDayRounds keeps user-added exercises on rest days", () => {
    const mon = getCatalogPlanForDay(1);
    const customized = applyRestDayToPlan(mon, "full_rest");
    const withWork = {
      ...customized,
      rounds: [
        {
          roundNumber: 1,
          exercises: [
            {
              exerciseId: "push-up",
              category: "UP" as const,
              targetReps: "10",
            },
          ],
        },
      ],
    };
    expect(stripPhantomRestDayRounds(withWork).rounds).toHaveLength(1);
  });
});
