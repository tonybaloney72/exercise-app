import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { materializeTrainingWeek } from "@/lib/planGenerator";
import { buildProgramProfileInputFromSettings } from "@/lib/programProfile";
import type { WeekBlueprint } from "@/lib/weekBlueprint";
import type { UserSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/repos/types";

/** User-reported guided week layout (May 2026). */
function userWeekBlueprint(): WeekBlueprint {
  const monTuePushPull = (strength: "upper_push" | "upper_pull"): WeekBlueprint[1] => ({
    dayKind: "workout",
    rounds: [
      { groups: ["cardio"], exerciseCount: 5 },
      { groups: ["cardio"], exerciseCount: 5 },
      { groups: [strength], exerciseCount: 5 },
      { groups: [strength], exerciseCount: 5 },
      { groups: [strength], exerciseCount: 5 },
    ],
    cardio: [],
  });

  const wedSat = (): WeekBlueprint[3] => ({
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
  });

  return {
    0: { dayKind: "full_rest", rounds: [], cardio: [] },
    1: monTuePushPull("upper_push"),
    2: monTuePushPull("upper_pull"),
    3: wedSat(),
    4: monTuePushPull("upper_push"),
    5: monTuePushPull("upper_pull"),
    6: wedSat(),
  };
}

function roundCategories(dow: number, week: ReturnType<typeof materializeTrainingWeek>) {
  const plan = week[dow]!;
  return plan.rounds.map((r) => [
    ...new Set(r.exercises.map((e) => e.category)),
  ]);
}

describe("guided week materialization (user layout)", () => {
  const settings: UserSettings = {
    ...DEFAULT_SETTINGS,
    programMode: "custom",
    customBuildStyle: "guided",
    weekBlueprint: userWeekBlueprint(),
    weekBlueprintCustomized: true,
  };

  const week = materializeTrainingWeek(
    buildCatalogWeek(),
    {},
    [...DEFAULT_AVAILABLE_EQUIPMENT],
    "balanced",
    "standard",
    undefined,
    "user-layout-test",
    buildProgramProfileInputFromSettings(settings),
    settings,
  );

  it("Monday: 2 cardio rounds + 3 push rounds", () => {
    const cats = roundCategories(1, week);
    expect(week[1]!.rounds).toHaveLength(5);
    expect(cats[0]).toEqual(["PC"]);
    expect(cats[1]).toEqual(["PC"]);
    expect(cats[2]).toEqual(["UP"]);
    expect(cats[3]).toEqual(["UP"]);
    expect(cats[4]).toEqual(["UP"]);
  });

  it("Wednesday: cardio + core mix + 2 lower", () => {
    const cats = roundCategories(3, week);
    expect(week[3]!.rounds).toHaveLength(4);
    expect(cats[0]).toEqual(["PC"]);
    expect(cats[1]!.some((c) => c.startsWith("C"))).toBe(true);
    expect(cats[2]).toEqual(["LB"]);
    expect(cats[3]).toEqual(["LB"]);
  });

  it("Saturday matches Wednesday structure", () => {
    expect(roundCategories(6, week)).toEqual(roundCategories(3, week));
  });

  it("materializes push rounds when repeat-clone metadata mismatches groups", () => {
    const blueprint = userWeekBlueprint();
    for (const dow of [1, 2, 4, 5]) {
      const day = blueprint[dow]!;
      day.rounds = day.rounds.map((round, index) =>
        index >= 2
          ? {
              ...round,
              cloneOfRoundIndex: 0,
              cloneMode: "repeat" as const,
            }
          : round,
      );
    }
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      programMode: "custom",
      customBuildStyle: "guided",
      weekBlueprint: blueprint,
      weekBlueprintCustomized: true,
    };
    const week = materializeTrainingWeek(
      buildCatalogWeek(),
      {},
      [...DEFAULT_AVAILABLE_EQUIPMENT],
      "balanced",
      "standard",
      undefined,
      "clone-mismatch-test",
      buildProgramProfileInputFromSettings(settings),
      settings,
    );
    for (const dow of [1, 2, 4, 5]) {
      const cats = roundCategories(dow, week);
      const strength = dow === 2 || dow === 5 ? "UPL" : "UP";
      expect(cats[2]).toEqual([strength]);
      expect(cats[3]).toEqual([strength]);
      expect(cats[4]).toEqual([strength]);
    }
  });
});
