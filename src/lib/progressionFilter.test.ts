import { describe, expect, it } from "vitest";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { getReplacementCandidates } from "@/lib/exerciseCandidates";
import { resolveExpertiseFilter } from "@/lib/expertiseLevels";
import {
  exerciseMeetsProgressionMinStep,
  minProgressionStepForCap,
} from "@/lib/progressionFilter";
import type { ExpertiseByGroup } from "@/types";

const EQUIP = [...DEFAULT_AVAILABLE_EQUIPMENT];

const ADVANCED_PUSH: ExpertiseByGroup = {
  core: "intermediate",
  cardio: "intermediate",
  lower: "intermediate",
  upper_push: "advanced",
  upper_pull: "intermediate",
};

describe("progressionFilter", () => {
  it("maps advanced cap to min step 3", () => {
    expect(minProgressionStepForCap("advanced")).toBe(3);
  });

  it("blocks knee push-up regressions for advanced push cap", () => {
    expect(
      exerciseMeetsProgressionMinStep("UP-1", "UP", ADVANCED_PUSH),
    ).toBe(false);
    expect(
      exerciseMeetsProgressionMinStep("UP-6", "UP", ADVANCED_PUSH),
    ).toBe(false);
    expect(
      exerciseMeetsProgressionMinStep("HC-226", "UP", ADVANCED_PUSH),
    ).toBe(true);
  });

  it("excludes regressions from replacement pool", () => {
    const filter = resolveExpertiseFilter({
      expertiseByGroup: ADVANCED_PUSH,
    });
    const candidates = getReplacementCandidates({
      category: "UP",
      excludeExerciseIds: new Set(),
      availableEquipment: EQUIP,
      expertiseFilter: filter,
    });
    const ids = candidates.map((c) => c.id);
    expect(ids).not.toContain("UP-1");
    expect(ids).not.toContain("UP-6");
    expect(ids.some((id) => id === "HC-226")).toBe(true);
  });

  it("does not filter exercises outside a family", () => {
    expect(
      exerciseMeetsProgressionMinStep("UP-5", "UP", ADVANCED_PUSH),
    ).toBe(true);
  });

  it("allows regressions when progression families are disabled in settings", () => {
    const filter = resolveExpertiseFilter({
      expertiseByGroup: ADVANCED_PUSH,
      progressionFamiliesEnabled: false,
    });
    const candidates = getReplacementCandidates({
      category: "UP",
      excludeExerciseIds: new Set(),
      availableEquipment: EQUIP,
      expertiseFilter: filter,
    });
    expect(candidates.some((c) => c.id === "UP-1")).toBe(true);
  });
});
