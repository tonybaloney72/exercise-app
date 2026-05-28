import { describe, expect, it } from "vitest";
import { buildPplWeek } from "@/lib/pplWeekTemplate";
import { prepareWeekSeedForUser } from "@/lib/weekPlanPreferences";
import { DEFAULT_SETTINGS } from "@/lib/repos/types";
import {
  classicWeeklyPplSchedule,
  DEFAULT_WEEKLY_PPL_SCHEDULE,
  detectPplSchedulePreset,
  pplWeeklyCardioEligibleDaysFromSchedule,
  resolveWeeklyPplSchedule,
  sanitizePplWeeklyCardioByDayForSchedule,
  threeDayPplSchedule,
  weeklyPplScheduleEqual,
} from "@/lib/pplWeekSchedule";
import type { CardioActivityKind, UserSettings } from "@/types";

describe("pplWeekSchedule", () => {
  it("resolveWeeklyPplSchedule uses classic default when not customized", () => {
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      programMode: "preset",
      weeklyPplScheduleCustomized: false,
    };
    expect(resolveWeeklyPplSchedule(settings)).toEqual(DEFAULT_WEEKLY_PPL_SCHEDULE);
  });

  it("threeDayPplSchedule puts legs on Friday only", () => {
    const sched = threeDayPplSchedule();
    expect(sched[5]).toBe("legs");
    expect(sched[3]).toBe("pull");
    expect(sched[1]).toBe("push");
    expect(pplWeeklyCardioEligibleDaysFromSchedule(sched)).toEqual([1, 3]);
  });

  it("sanitizePplWeeklyCardioByDayForSchedule clears non-eligible days", () => {
    const sched = threeDayPplSchedule();
    const raw: Record<number, CardioActivityKind[]> = {
      1: ["jog"],
      3: ["walk"],
      5: ["swim"],
    };
    const clean = sanitizePplWeeklyCardioByDayForSchedule(raw, sched);
    expect(clean[5]).toEqual([]);
    expect(clean[1]).toEqual(["jog"]);
    expect(clean[3]).toEqual(["walk"]);
  });

  it("3-day full rest weekdays have no rounds after week prep", () => {
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      programMode: "preset",
      weeklyPplSchedule: threeDayPplSchedule(),
      weeklyPplScheduleCustomized: true,
    };
    const week = buildPplWeek(settings);
    const prepared = prepareWeekSeedForUser(
      week,
      settings,
      settings.availableEquipment,
    );
    expect(prepared[2]!.restDayMode).toBe("full_rest");
    expect(prepared[2]!.rounds).toEqual([]);
  });

  it("buildPplWeek reflects custom schedule on leg day", () => {
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      programMode: "preset",
      weeklyPplSchedule: threeDayPplSchedule(),
      weeklyPplScheduleCustomized: true,
    };
    const week = buildPplWeek(settings);
    expect(week[5]!.strengthFocus).toEqual(["LB"]);
    expect(week[5]!.hasJog).toBe(false);
    expect(week[1]!.strengthFocus).toEqual(["UP"]);
    expect(week[1]!.hasJog).toBe(true);
  });

  it("weeklyPplScheduleEqual compares all weekdays", () => {
    expect(
      weeklyPplScheduleEqual(DEFAULT_WEEKLY_PPL_SCHEDULE, { ...DEFAULT_WEEKLY_PPL_SCHEDULE }),
    ).toBe(true);
    const tweaked = { ...DEFAULT_WEEKLY_PPL_SCHEDULE, 2: "legs" as const };
    expect(weeklyPplScheduleEqual(DEFAULT_WEEKLY_PPL_SCHEDULE, tweaked)).toBe(false);
  });

  it("detectPplSchedulePreset identifies classic, three-day, and custom", () => {
    expect(detectPplSchedulePreset(classicWeeklyPplSchedule())).toBe("classic");
    expect(detectPplSchedulePreset(threeDayPplSchedule())).toBe("three_day");
    expect(
      detectPplSchedulePreset({ ...DEFAULT_WEEKLY_PPL_SCHEDULE, 2: "legs" }),
    ).toBe("custom");
  });
});
