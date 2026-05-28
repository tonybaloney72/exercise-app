import { describe, expect, it } from "vitest";
import { getCatalogPlanForDay } from "@/data/trainingWeekCatalog";
import {
  buildLayoutRoundSpecs,
  defaultGroupRounds,
  describeLayoutDayStructure,
  resolveLayoutDayStructure,
  resolveMixedRoundCount,
  sanitizeWeeklyLayoutDayStructure,
} from "@/lib/weeklyLayoutDayStructure";
import { groupsForCatalogDay } from "@/lib/weeklyCategoryLayout";

describe("weeklyLayoutDayStructure", () => {
  it("defaults pull + cardio to 3 pull and 1 cardio blocks", () => {
    const rounds = defaultGroupRounds(["upper_pull", "cardio"], 3);
    expect(rounds.upper_pull).toBe(3);
    expect(rounds.cardio).toBe(1);
  });

  it("buildLayoutRoundSpecs orders blocks by group", () => {
    const structure = resolveLayoutDayStructure(5, ["upper_pull", "cardio"], {
      5: {
        mode: "blocks",
        groupRounds: { upper_pull: 3, cardio: 1 },
        repeatStrength: false,
      },
    });
    const specs = buildLayoutRoundSpecs(
      ["upper_pull", "cardio"],
      structure,
      3,
    );
    expect(specs).toHaveLength(4);
    expect(specs.slice(0, 3).every((s) => s.group === "upper_pull")).toBe(true);
    expect(specs[3]?.group).toBe("cardio");
  });

  it("describeLayoutDayStructure summarizes blocks", () => {
    const structure = resolveLayoutDayStructure(5, ["upper_pull", "cardio"], {
      5: {
        mode: "blocks",
        groupRounds: { upper_pull: 3, cardio: 1 },
        repeatStrength: false,
      },
    });
    const text = describeLayoutDayStructure(["upper_pull", "cardio"], structure);
    expect(text).toContain("3×");
    expect(text).toContain("Pull");
  });

  it("mixed mode uses mixedRoundCount for round specs", () => {
    const structure = resolveLayoutDayStructure(1, ["upper_push", "lower"], {
      1: {
        mode: "mixed",
        groupRounds: { upper_push: 2, lower: 1 },
        mixedRoundCount: 5,
        repeatStrength: false,
      },
    });
    expect(resolveMixedRoundCount(structure, 3)).toBe(5);
    const specs = buildLayoutRoundSpecs(
      ["upper_push", "lower"],
      structure,
      3,
    );
    expect(specs).toHaveLength(5);
    expect(specs.every((s) => s.group === "mixed")).toBe(true);
    expect(describeLayoutDayStructure(["upper_push", "lower"], structure)).toBe(
      "5 mixed rounds",
    );
  });

  it("sanitize migrates from layout groups", () => {
    const mon = getCatalogPlanForDay(1);
    const layout = { 1: groupsForCatalogDay(mon) };
    const structure = sanitizeWeeklyLayoutDayStructure(undefined, layout);
    expect(structure[1]?.mode).toBe("blocks");
    expect((structure[1]?.groupRounds.core_front ?? 0) > 0).toBe(true);
  });
});
