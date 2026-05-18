import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { applyProgramProfileToDayPlan } from "@/lib/programProfile";
import { categoriesPresentInPlan } from "@/lib/planDisplayCategories";
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
});
