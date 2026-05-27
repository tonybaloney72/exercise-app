import { describe, expect, it } from "vitest";
import {
  applyTemplateToDayPlan,
  dayPlanToTemplateSnapshot,
  normalizeTemplateName,
} from "@/lib/workoutDayTemplates";
import type { DayPlan } from "@/types";

const baseDay: DayPlan = {
  dayOfWeek: 2,
  name: "Tuesday",
  theme: "Upper",
  hasJog: false,
  strengthFocus: ["UP"],
  coreGroups: ["CR"],
  rounds: [{ roundNumber: 1, exercises: [] }],
};

describe("workoutDayTemplates", () => {
  it("normalizeTemplateName trims and rejects empty", () => {
    expect(normalizeTemplateName("  Leg day  ")).toBe("Leg day");
    expect(normalizeTemplateName("   ")).toBeNull();
  });

  it("applyTemplateToDayPlan keeps calendar metadata", () => {
    const snapshot = dayPlanToTemplateSnapshot({
      ...baseDay,
      rounds: [
        {
          roundNumber: 1,
          exercises: [
            {
              exerciseId: "PC-1",
              targetReps: "12",
              category: "PC",
            },
          ],
        },
      ],
      cardioActivities: [{ kind: "jog", exerciseId: "END-JOG" }],
    });
    const next = applyTemplateToDayPlan(baseDay, snapshot);
    expect(next.name).toBe("Tuesday");
    expect(next.dayOfWeek).toBe(2);
    expect(next.rounds[0].exercises[0].exerciseId).toBe("PC-1");
    expect(next.cardioActivities?.[0].kind).toBe("jog");
  });
});
