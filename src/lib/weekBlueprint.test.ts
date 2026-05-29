import { describe, expect, it } from "vitest";
import { getCatalogPlanForDay } from "@/data/trainingWeekCatalog";
import {
  migrateLayoutToBlueprint,
  sanitizeWeekBlueprint,
  weeklyBlueprintFingerprint,
} from "@/lib/weekBlueprint";
import { resolveLayoutDayStructure } from "@/lib/weeklyLayoutDayStructure";
import { groupsForCatalogDay } from "@/lib/weeklyCategoryLayout";

describe("weekBlueprint", () => {
  it("migrateLayoutToBlueprint expands mixed mode to per-round groups", () => {
    const enabled = ["upper_pull", "cardio"] as const;
    const structure = {
      5: resolveLayoutDayStructure(5, [...enabled], {
        5: {
          mode: "mixed" as const,
          groupRounds: {},
          mixedRoundCount: 3,
          repeatStrength: false,
        },
      }),
    };
    const blueprint = migrateLayoutToBlueprint(
      { 5: [...enabled] },
      structure,
    );
    expect(blueprint[5]?.rounds).toHaveLength(3);
    expect(blueprint[5]?.rounds[0]?.groups).toEqual(["upper_pull", "cardio"]);
  });

  it("fingerprint changes when round clone spec changes", () => {
    const base = sanitizeWeekBlueprint({
      1: {
        dayKind: "workout",
        rounds: [{ groups: ["upper_push"] }],
      },
    });
    const cloned = sanitizeWeekBlueprint({
      1: {
        dayKind: "workout",
        rounds: [
          { groups: ["upper_push"] },
          {
            groups: ["upper_push"],
            cloneOfRoundIndex: 0,
            cloneMode: "repeat",
          },
        ],
      },
    });
    expect(weeklyBlueprintFingerprint(base)).not.toBe(
      weeklyBlueprintFingerprint(cloned),
    );
  });

  it("suggest from catalog produces workout days for weekdays", () => {
    const mon = getCatalogPlanForDay(1);
    const groups = groupsForCatalogDay(mon);
    const blueprint = migrateLayoutToBlueprint(
      { 1: groups },
      { 1: resolveLayoutDayStructure(1, groups, undefined) },
    );
    expect(blueprint[1]?.dayKind).toBe("workout");
    expect((blueprint[1]?.rounds.length ?? 0) > 0).toBe(true);
  });
});
