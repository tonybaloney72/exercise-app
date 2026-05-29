import { describe, expect, it } from "vitest";
import { getCatalogPlanForDay } from "@/data/trainingWeekCatalog";
import {
  applyProgramProfileToDayPlan,
  buildProgramProfileInput,
} from "@/lib/programProfile";
import type { WeekBlueprint } from "@/lib/weekBlueprint";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import type { ExercisePreferenceMap } from "@/lib/repos";
import type { UserSettings } from "@/types";

const EMPTY_PREFS: ExercisePreferenceMap = {};

describe("programProfile guided blueprint", () => {
  it("materializes per-round groups from blueprint", () => {
    const mon = getCatalogPlanForDay(1);
    const blueprint: WeekBlueprint = {
      1: {
        dayKind: "workout",
        rounds: [
          { groups: ["upper_push", "cardio"] },
          { groups: ["upper_pull"] },
        ],
      },
    };
    const profile = buildProgramProfileInput("balanced", undefined, false, {
      blueprintMode: true,
      weekBlueprint: blueprint,
    });
    const userSettings = {
      programMode: "custom",
      customBuildStyle: "guided",
      weekBlueprint: blueprint,
      weekBlueprintCustomized: true,
    } as UserSettings;

    const out = applyProgramProfileToDayPlan(
      mon,
      "balanced",
      "standard",
      [...DEFAULT_AVAILABLE_EQUIPMENT],
      EMPTY_PREFS,
      undefined,
      "blueprint-test",
      profile,
      userSettings,
    );

    expect(out.rounds).toHaveLength(2);
    const cats = new Set(
      out.rounds.flatMap((r) => r.exercises.map((e) => e.category)),
    );
    expect(cats.has("UP") || cats.has("PC")).toBe(true);
    expect(cats.has("UPL")).toBe(true);
  });

  it("repeat clone copies exercises from source round", () => {
    const fri = getCatalogPlanForDay(5);
    const blueprint: WeekBlueprint = {
      5: {
        dayKind: "workout",
        rounds: [
          { groups: ["upper_pull"] },
          {
            groups: ["upper_pull"],
            cloneOfRoundIndex: 0,
            cloneMode: "repeat",
          },
        ],
      },
    };
    const profile = buildProgramProfileInput("balanced", undefined, false, {
      blueprintMode: true,
      weekBlueprint: blueprint,
    });
    const userSettings = {
      programMode: "custom",
      customBuildStyle: "guided",
      weekBlueprint: blueprint,
      weekBlueprintCustomized: true,
    } as UserSettings;

    const out = applyProgramProfileToDayPlan(
      fri,
      "balanced",
      "standard",
      [...DEFAULT_AVAILABLE_EQUIPMENT],
      EMPTY_PREFS,
      undefined,
      "blueprint-clone",
      profile,
      userSettings,
    );

    expect(out.rounds).toHaveLength(2);
    expect(out.rounds[0]!.exercises.length).toBeGreaterThan(0);
    expect(out.rounds[1]!.exercises).toEqual(out.rounds[0]!.exercises);
  });
});
