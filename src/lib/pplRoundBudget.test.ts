import { describe, expect, it } from "vitest";
import { getPplPlanForDay } from "@/lib/pplWeekTemplate";
import { buildPplFullBudget, pplRoundBudget } from "@/lib/pplRoundBudget";
import { activeRecoveryDayPlan } from "@/lib/restDays";

describe("pplRoundBudget", () => {
  it("push day full budget is all UP", () => {
    const mon = getPplPlanForDay(1);
    expect(buildPplFullBudget(mon, 1)).toEqual([
      "UP",
      "UP",
      "UP",
      "UP",
      "UP",
      "UP",
      "UP",
    ]);
  });

  it("leg day full budget mixes LB and core, no PC", () => {
    const wed = getPplPlanForDay(3);
    const full = buildPplFullBudget(wed, 1);
    expect(full).toContain("LB");
    expect(full.some((c) => c === "CF" || c === "CL")).toBe(true);
    expect(full).not.toContain("PC");
    expect(full).not.toContain("UP");
  });

  it("compact push trims to three UP slots", () => {
    const mon = getPplPlanForDay(1);
    expect(pplRoundBudget(mon, 1, 3)).toEqual(["UP", "UP", "UP"]);
  });

  it("active recovery is all CS", () => {
    const ar = activeRecoveryDayPlan(getPplPlanForDay(0));
    expect(pplRoundBudget(ar, 1, 5).every((c) => c === "CS")).toBe(true);
  });
});
