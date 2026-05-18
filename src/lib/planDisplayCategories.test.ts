import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { applyProgramProfileToDayPlan } from "@/lib/programProfile";
import {
  categoriesPresentInPlan,
  planDaySubtitle,
} from "@/lib/planDisplayCategories";
import type { ExercisePreferenceMap } from "@/lib/repos";

const EQUIP = [...DEFAULT_AVAILABLE_EQUIPMENT];
const EMPTY_PREFS: ExercisePreferenceMap = {};

describe("categoriesPresentInPlan", () => {
  it("reads categories from round slots, not static strengthFocus metadata", () => {
    const friday = buildCatalogWeek()[5]!;
    const conditioning = applyProgramProfileToDayPlan(
      friday,
      "conditioning",
      "standard",
      EQUIP,
      EMPTY_PREFS,
    );
    const fromMeta = [...friday.strengthFocus, ...friday.coreGroups];
    const fromRounds = categoriesPresentInPlan(conditioning);

    expect(fromMeta).toEqual(expect.arrayContaining(["UP", "UPL", "CF", "CL"]));
    expect(fromRounds).toContain("PC");
    expect(fromRounds.filter((c) => c === "PC").length).toBe(1);
  });

  it("does not add PC pill when jog is scheduled but rounds have no PC", () => {
    const tuesday = buildCatalogWeek()[2]!;
    const upper = applyProgramProfileToDayPlan(
      tuesday,
      "upper_body",
      "standard",
      EQUIP,
      EMPTY_PREFS,
    );
    expect(upper.hasJog).toBe(true);
    const pills = categoriesPresentInPlan(upper);
    expect(pills).not.toContain("PC");
  });

  it("preferMaterialized shows round categories on balanced custom-style plans", () => {
    const monday = buildCatalogWeek()[1]!;
    const shaped = applyProgramProfileToDayPlan(
      monday,
      "balanced",
      "standard",
      EQUIP,
      EMPTY_PREFS,
    );
    expect(planDaySubtitle(shaped, "balanced")).toBe(monday.theme);
    expect(planDaySubtitle(shaped, "balanced", { preferMaterialized: true })).not.toBe(
      monday.theme,
    );
    expect(planDaySubtitle(shaped, "balanced", { preferMaterialized: true })).toContain(
      "Upper Push",
    );
  });

  it("planDaySubtitle uses catalog theme when balanced", () => {
    const monday = buildCatalogWeek()[1]!;
    const shaped = applyProgramProfileToDayPlan(
      monday,
      "balanced",
      "standard",
      EQUIP,
      EMPTY_PREFS,
    );
    expect(planDaySubtitle(shaped, "balanced")).toBe(monday.theme);
  });

  it("planDaySubtitle reflects materialized categories when preset is not balanced", () => {
    const tuesday = buildCatalogWeek()[2]!;
    const upper = applyProgramProfileToDayPlan(
      tuesday,
      "upper_body",
      "standard",
      EQUIP,
      EMPTY_PREFS,
    );
    const subtitle = planDaySubtitle(upper, "upper_body");
    expect(subtitle).not.toBe(tuesday.theme);
    expect(subtitle.length).toBeGreaterThan(0);
  });
});
