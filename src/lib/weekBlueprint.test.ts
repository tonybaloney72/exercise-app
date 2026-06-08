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

  it("sanitize strips repeat-clone when groups differ from source round", () => {
    const sanitized = sanitizeWeekBlueprint({
      1: {
        dayKind: "workout",
        rounds: [
          { groups: ["cardio"], exerciseCount: 5 },
          {
            groups: ["upper_push"],
            exerciseCount: 5,
            cloneOfRoundIndex: 0,
            cloneMode: "repeat",
          },
        ],
      },
    });
    expect(sanitized[1]?.rounds[1]?.cloneOfRoundIndex).toBeUndefined();
    expect(sanitized[1]?.rounds[1]?.cloneMode).toBeUndefined();
    expect(sanitized[1]?.rounds[1]?.groups).toEqual(["upper_push"]);
  });

  it("preserves explicit exercise counts above 8 when sanitizing", () => {
    const sanitized = sanitizeWeekBlueprint({
      1: {
        dayKind: "workout",
        rounds: [{ groups: ["upper_push"], exerciseCount: 12 }],
      },
    });
    expect(sanitized[1]?.rounds[0]?.exerciseCount).toBe(12);
  });

  it("clamps explicit exercise counts below 1 to 1 when sanitizing", () => {
    const sanitized = sanitizeWeekBlueprint({
      1: {
        dayKind: "workout",
        rounds: [{ groups: ["upper_push"], exerciseCount: 0 }],
      },
    });
    expect(sanitized[1]?.rounds[0]?.exerciseCount).toBe(1);
  });
});
