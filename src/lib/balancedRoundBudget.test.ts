import { describe, expect, it } from "vitest";
import { getCatalogPlanForDay } from "@/data/trainingWeekCatalog";
import {
  balancedRoundBudget,
  buildBalancedFullBudget,
  trimBalancedBudget,
} from "@/lib/balancedRoundBudget";
import { ROUND_DENSITY_TARGETS } from "@/lib/programProfile";
import type { ExerciseCategory } from "@/types";

function cats(
  plan: ReturnType<typeof getCatalogPlanForDay>,
  round: number,
  density: keyof typeof ROUND_DENSITY_TARGETS = "standard",
): ExerciseCategory[] {
  return balancedRoundBudget(plan, round, ROUND_DENSITY_TARGETS[density]);
}

describe("balancedRoundBudget", () => {
  const monday = getCatalogPlanForDay(1);

  it("Sunday recovery is all CS at standard density", () => {
    const sunday = getCatalogPlanForDay(0);
    const r1 = cats(sunday, 1);
    expect(r1).toHaveLength(5);
    expect(r1.every((c) => c === "CS")).toBe(true);
  });

  it("Monday standard round 1 matches push + core + jog recipe", () => {
    expect(cats(monday, 1)).toEqual(["UP", "UP", "CF", "CL", "PC"]);
  });

  it("Monday standard rounds 2–3 rotate core extras", () => {
    expect(cats(monday, 2)).toEqual(["UP", "CF", "CF", "CL", "PC"]);
    expect(cats(monday, 3)).toEqual(["UP", "CF", "CL", "CL", "PC"]);
  });

  it("Monday compact keeps jog PC", () => {
    expect(cats(monday, 1, "compact")).toEqual(["UP", "CF", "PC"]);
  });

  it("Thursday standard has one PC at standard density", () => {
    const thursday = getCatalogPlanForDay(4);
    const r1 = cats(thursday, 1);
    expect(r1.filter((c) => c === "PC")).toHaveLength(1);
    expect(r1).toContain("LB");
    expect(r1).toContain("CL");
    expect(r1).toContain("CS");
  });

  it("Thursday full can include two PC slots", () => {
    const thursday = getCatalogPlanForDay(4);
    const full = buildBalancedFullBudget(thursday, 1);
    expect(full.filter((c) => c === "PC").length).toBeGreaterThanOrEqual(2);
  });
});
