import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { analyzeDayPlanBalance } from "@/lib/workoutBalanceAlerts";
import type { DayPlan } from "@/types";

describe("analyzeDayPlanBalance", () => {
  it("returns no warnings for active recovery sunday", () => {
    const sunday = buildCatalogWeek()[0]!;
    const alerts = analyzeDayPlanBalance(sunday);
    expect(alerts.every((a) => a.severity !== "warning")).toBe(true);
  });

  it("warns when push-heavy with no pull", () => {
    const plan: DayPlan = {
      ...buildCatalogWeek()[1]!,
      rounds: [
        {
          roundNumber: 1,
          exercises: [
            { exerciseId: "UP-1", targetReps: "10", category: "UP" },
            { exerciseId: "UP-2", targetReps: "10", category: "UP" },
            { exerciseId: "UP-3", targetReps: "10", category: "UP" },
            { exerciseId: "UP-4", targetReps: "10", category: "UP" },
          ],
        },
      ],
    };
    const alerts = analyzeDayPlanBalance(plan);
    expect(alerts.some((a) => a.id === "push-no-pull")).toBe(true);
  });
});
