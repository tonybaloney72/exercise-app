import { describe, expect, it } from "vitest";
import {
  buildPplWeek,
  coreGroupsForPplDayType,
  getPplDayType,
  getPplPlanForDay,
  isThemesOnlyPplPlan,
  PPL_BALANCED_SHELLS,
  PPL_LEG_DAY_CORE_GROUPS,
  pplTemplateFingerprint,
  strengthFocusForPplDayType,
  pplWeeklyCardioEligibleDays,
  sanitizePplWeeklyCardioByDay,
  suggestWeeklyCardioFromPpl,
} from "@/lib/pplWeekTemplate";

describe("pplWeekTemplate", () => {
  it("defines seven Balanced shells in Sun–Sat order", () => {
    expect(PPL_BALANCED_SHELLS).toHaveLength(7);
    expect(PPL_BALANCED_SHELLS.map((s) => s.dayOfWeek)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
    expect(PPL_BALANCED_SHELLS.map((s) => s.dayType)).toEqual([
      "active_recovery",
      "push",
      "pull",
      "legs",
      "push",
      "pull",
      "legs",
    ]);
  });

  it("stores themes only — no exercise ids in seed rounds", () => {
    const week = buildPplWeek();
    for (let dow = 0; dow < 7; dow++) {
      expect(isThemesOnlyPplPlan(week[dow]!)).toBe(true);
    }
  });

  it("Monday push: UP only, no core, cardio finisher", () => {
    const mon = getPplPlanForDay(1);
    expect(getPplDayType(1)).toBe("push");
    expect(mon.strengthFocus).toEqual(["UP"]);
    expect(mon.coreGroups).toEqual([]);
    expect(mon.hasJog).toBe(true);
    expect(mon.rounds).toHaveLength(3);
  });

  it("Wednesday legs: LB + all core groups, no cardio finisher", () => {
    const wed = getPplPlanForDay(3);
    expect(getPplDayType(3)).toBe("legs");
    expect(wed.strengthFocus).toEqual(["LB"]);
    expect(wed.coreGroups).toEqual([...PPL_LEG_DAY_CORE_GROUPS]);
    expect(wed.hasJog).toBe(false);
  });

  it("Thursday push matches Monday rhythm", () => {
    const thu = getPplPlanForDay(4);
    expect(thu.strengthFocus).toEqual(["UP"]);
    expect(thu.coreGroups).toEqual([]);
    expect(thu.hasJog).toBe(true);
  });

  it("Saturday legs: no finisher", () => {
    const sat = getPplPlanForDay(6);
    expect(sat.strengthFocus).toEqual(["LB"]);
    expect(sat.hasJog).toBe(false);
  });

  it("Sunday recovery shell: light core groups + cardio flag", () => {
    const sun = getPplPlanForDay(0);
    expect(sun.strengthFocus).toEqual([]);
    expect(sun.coreGroups).toEqual(["CR", "CS"]);
    expect(sun.hasJog).toBe(true);
    expect(sun.rounds).toHaveLength(1);
  });

  it("strengthFocusForPplDayType never mixes push and pull", () => {
    expect(strengthFocusForPplDayType("push")).toEqual(["UP"]);
    expect(strengthFocusForPplDayType("pull")).toEqual(["UPL"]);
    expect(coreGroupsForPplDayType("push")).toEqual([]);
    expect(coreGroupsForPplDayType("pull")).toEqual([]);
  });

  it("pplWeeklyCardioEligibleDays excludes leg days", () => {
    expect(pplWeeklyCardioEligibleDays()).toEqual([0, 1, 2, 4, 5]);
    expect(pplWeeklyCardioEligibleDays()).not.toContain(3);
    expect(pplWeeklyCardioEligibleDays()).not.toContain(6);
  });

  it("sanitizePplWeeklyCardioByDay clears leg-day selections", () => {
    const raw = suggestWeeklyCardioFromPpl();
    raw[6] = ["swim"];
    const clean = sanitizePplWeeklyCardioByDay(raw);
    expect(clean[6]).toEqual([]);
    expect(clean[1]).toEqual(["jog"]);
  });

  it("suggestWeeklyCardioFromPpl enables jog on finisher days only", () => {
    const cardio = suggestWeeklyCardioFromPpl();
    expect(cardio[0]).toEqual(["jog"]);
    expect(cardio[1]).toEqual(["jog"]);
    expect(cardio[2]).toEqual(["jog"]);
    expect(cardio[3]).toEqual([]);
    expect(cardio[4]).toEqual(["jog"]);
    expect(cardio[5]).toEqual(["jog"]);
    expect(cardio[6]).toEqual([]);
  });

  it("pplTemplateFingerprint includes schedule segment (v4)", () => {
    expect(pplTemplateFingerprint()).toContain("ppl:ppl-2026-05-v4:balanced");
    expect(pplTemplateFingerprint()).toContain("pplSched:");
  });
});
