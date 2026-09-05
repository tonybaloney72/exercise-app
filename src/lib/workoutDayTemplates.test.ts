import { describe, expect, it } from "vitest";
import {
  applyTemplateToDayPlan,
  applyTemplateToDayPlanWithMode,
  dayPlanToTemplateSnapshot,
  defaultTemplateApplyMode,
  emptyWorkoutDayTemplateSnapshot,
  normalizeTemplateName,
  templatePlanSummary,
  templateToEditorDayPlan,
} from "@/lib/workoutDayTemplates";
import type { DayPlan, WorkoutDayTemplateSnapshot } from "@/types";

const baseDay: DayPlan = {
  dayOfWeek: 2,
  name: "Tuesday",
  theme: "Upper",
  hasJog: false,
  strengthFocus: ["UP"],
  coreGroups: ["CR"],
  rounds: [{ roundNumber: 1, exercises: [] }],
};

const multiDay: DayPlan = {
  ...baseDay,
  rounds: [
    {
      roundNumber: 1,
      exercises: [{ exerciseId: "keep-1", targetReps: "8", category: "PC" }],
    },
    {
      roundNumber: 2,
      exercises: [{ exerciseId: "keep-2", targetReps: "8", category: "PC" }],
    },
    {
      roundNumber: 3,
      exercises: [{ exerciseId: "keep-3", targetReps: "8", category: "PC" }],
    },
  ],
};

const oneRoundTemplate: WorkoutDayTemplateSnapshot = {
  strengthFocus: ["PC"],
  coreGroups: [],
  rounds: [
    {
      roundNumber: 1,
      exercises: [
        { exerciseId: "tpl-1", targetReps: "10", category: "PC" },
      ],
    },
  ],
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

  it("emptyWorkoutDayTemplateSnapshot starts with one empty round", () => {
    const empty = emptyWorkoutDayTemplateSnapshot();
    expect(empty.rounds).toHaveLength(1);
    expect(empty.rounds[0].exercises).toEqual([]);
  });

  it("templateToEditorDayPlan applies snapshot under a name", () => {
    const plan = templateToEditorDayPlan("Push A", {
      strengthFocus: ["PC"],
      coreGroups: [],
      rounds: [
        {
          roundNumber: 1,
          exercises: [
            { exerciseId: "PC-1", targetReps: "10", category: "PC" },
          ],
        },
      ],
    });
    expect(plan.name).toBe("Push A");
    expect(plan.dayOfWeek).toBe(0);
    expect(plan.rounds[0].exercises[0].exerciseId).toBe("PC-1");
  });

  it("templatePlanSummary counts rounds exercises and cardio", () => {
    expect(
      templatePlanSummary({
        strengthFocus: [],
        coreGroups: [],
        rounds: [
          {
            roundNumber: 1,
            exercises: [
              { exerciseId: "a", targetReps: "8", category: "PC" },
              { exerciseId: "b", targetReps: "8", category: "PC" },
            ],
          },
          { roundNumber: 2, exercises: [] },
        ],
        cardioActivities: [{ kind: "walk", exerciseId: "END-WALK" }],
      }),
    ).toBe("2 rounds · 2 exercises · 1 cardio");
  });

  it("defaultTemplateApplyMode prefers append for single-round strength templates", () => {
    expect(defaultTemplateApplyMode(oneRoundTemplate)).toBe("append_rounds");
    expect(
      defaultTemplateApplyMode({
        ...oneRoundTemplate,
        cardioActivities: [{ kind: "jog", exerciseId: "END-JOG" }],
      }),
    ).toBe("replace_day");
    expect(
      defaultTemplateApplyMode({
        ...oneRoundTemplate,
        rounds: [
          ...oneRoundTemplate.rounds,
          { roundNumber: 2, exercises: [] },
        ],
      }),
    ).toBe("replace_day");
  });

  it("append_rounds keeps existing rounds and day extras", () => {
    const withCardio: DayPlan = {
      ...multiDay,
      cardioActivities: [{ kind: "walk", exerciseId: "END-WALK" }],
    };
    const next = applyTemplateToDayPlanWithMode(withCardio, oneRoundTemplate, {
      mode: "append_rounds",
    });
    expect(next.rounds).toHaveLength(4);
    expect(next.rounds[0].exercises[0].exerciseId).toBe("keep-1");
    expect(next.rounds[3].exercises[0].exerciseId).toBe("tpl-1");
    expect(next.cardioActivities?.[0].kind).toBe("walk");
    expect(next.strengthFocus).toEqual(["UP"]);
  });

  it("replace_round splices template rounds over one day round", () => {
    const next = applyTemplateToDayPlanWithMode(multiDay, oneRoundTemplate, {
      mode: "replace_round",
      replaceRoundIndex: 1,
    });
    expect(next.rounds).toHaveLength(3);
    expect(next.rounds.map((r) => r.exercises[0]?.exerciseId)).toEqual([
      "keep-1",
      "tpl-1",
      "keep-3",
    ]);
  });
});
