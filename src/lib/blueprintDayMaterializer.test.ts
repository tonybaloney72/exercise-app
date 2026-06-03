import { describe, expect, it } from "vitest";
import { getCatalogPlanForDay } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { materializeBlueprintDayPlan } from "@/lib/blueprintDayMaterializer";
import type { DayBlueprint } from "@/lib/weekBlueprint";

const EQUIP = [...DEFAULT_AVAILABLE_EQUIPMENT];

describe("materializeBlueprintDayPlan", () => {
  it("materializes distinct groups per round (Mon: 2 cardio + 3 push)", () => {
    const mon = getCatalogPlanForDay(1);
    const blueprint: DayBlueprint = {
      dayKind: "workout",
      rounds: [
        { groups: ["cardio"], exerciseCount: 5 },
        { groups: ["cardio"], exerciseCount: 5 },
        { groups: ["upper_push"], exerciseCount: 5 },
        { groups: ["upper_push"], exerciseCount: 5 },
        { groups: ["upper_push"], exerciseCount: 5 },
      ],
      cardio: [],
    };

    const out = materializeBlueprintDayPlan(
      mon,
      blueprint,
      "standard",
      EQUIP,
      new Set(),
      new Set(),
    );

    expect(out.rounds).toHaveLength(5);
    expect(out.rounds[0]!.exercises).toHaveLength(5);
    expect(out.rounds[2]!.exercises).toHaveLength(5);

    const roundCategories = out.rounds.map((r) =>
      [...new Set(r.exercises.map((e) => e.category))],
    );
    expect(roundCategories[0]).toEqual(["PC"]);
    expect(roundCategories[1]).toEqual(["PC"]);
    expect(roundCategories[2]).toEqual(["UP"]);
    expect(roundCategories[3]).toEqual(["UP"]);
    expect(roundCategories[4]).toEqual(["UP"]);
  });

  it("clears catalog jog when blueprint cardio is empty", () => {
    const mon = getCatalogPlanForDay(1);
    expect(mon.hasJog).toBe(true);

    const out = materializeBlueprintDayPlan(
      mon,
      {
        dayKind: "workout",
        rounds: [{ groups: ["upper_push"], exerciseCount: 3 }],
        cardio: [],
      },
      "standard",
      EQUIP,
      new Set(),
      new Set(),
    );

    expect(out.hasJog).toBe(false);
    expect(out.cardioActivities ?? []).toHaveLength(0);
  });

  it("materializes Wed-style mix (1 cardio + core + 2 lower)", () => {
    const wed = getCatalogPlanForDay(3);
    const blueprint: DayBlueprint = {
      dayKind: "workout",
      rounds: [
        { groups: ["cardio"], exerciseCount: 5 },
        {
          groups: [
            "core_front",
            "core_lower",
            "core_rotational",
            "core_stability",
          ],
          exerciseCount: 8,
        },
        { groups: ["lower"], exerciseCount: 5 },
        { groups: ["lower"], exerciseCount: 5 },
      ],
      cardio: [],
    };

    const out = materializeBlueprintDayPlan(
      wed,
      blueprint,
      "standard",
      EQUIP,
      new Set(),
      new Set(),
    );

    expect(out.rounds).toHaveLength(4);
    const roundCategories = out.rounds.map((r) =>
      [...new Set(r.exercises.map((e) => e.category))].sort(),
    );
    expect(roundCategories[0]).toEqual(["PC"]);
    expect(roundCategories[1]?.some((c) => c.startsWith("C"))).toBe(true);
    expect(roundCategories[2]).toEqual(["LB"]);
    expect(roundCategories[3]).toEqual(["LB"]);
  });

  it("ignores repeat-clone when push groups differ from source cardio round", () => {
    const mon = getCatalogPlanForDay(1);
    const blueprint: DayBlueprint = {
      dayKind: "workout",
      rounds: [
        { groups: ["cardio"], exerciseCount: 5 },
        { groups: ["cardio"], exerciseCount: 5 },
        {
          groups: ["upper_push"],
          exerciseCount: 5,
          cloneOfRoundIndex: 0,
          cloneMode: "repeat",
        },
        {
          groups: ["upper_push"],
          exerciseCount: 5,
          cloneOfRoundIndex: 0,
          cloneMode: "repeat",
        },
        {
          groups: ["upper_push"],
          exerciseCount: 5,
          cloneOfRoundIndex: 0,
          cloneMode: "repeat",
        },
      ],
      cardio: [],
    };

    const out = materializeBlueprintDayPlan(
      mon,
      blueprint,
      "standard",
      EQUIP,
      new Set(),
      new Set(),
    );

    const roundCategories = out.rounds.map((r) => [
      ...new Set(r.exercises.map((e) => e.category)),
    ]);
    expect(roundCategories[0]).toEqual(["PC"]);
    expect(roundCategories[1]).toEqual(["PC"]);
    expect(roundCategories[2]).toEqual(["UP"]);
    expect(roundCategories[3]).toEqual(["UP"]);
    expect(roundCategories[4]).toEqual(["UP"]);
  });
});
