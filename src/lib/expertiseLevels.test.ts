import { describe, expect, it } from "vitest";
import { exerciseMap } from "@/data/exercises";
import {
  exerciseMeetsExpertiseCap,
  expertiseRank,
  resolveExpertiseFilter,
  sanitizeExpertiseLevel,
} from "@/lib/expertiseLevels";
import type { ExpertiseByGroup } from "@/types";

const NOVICE_PUSH: ExpertiseByGroup = {
  core: "intermediate",
  cardio: "intermediate",
  lower: "intermediate",
  upper_push: "novice",
  upper_pull: "intermediate",
};

describe("expertiseLevels", () => {
  it("orders levels for comparison", () => {
    expect(expertiseRank("beginner")).toBeLessThan(expertiseRank("expert"));
  });

  it("sanitizes invalid levels to intermediate", () => {
    expect(sanitizeExpertiseLevel("bogus")).toBe("intermediate");
  });

  it("resolveExpertiseFilter always returns sanitized caps", () => {
    const filter = resolveExpertiseFilter({});
    expect(filter.byGroup.upper_push).toBe("intermediate");
    expect(filter.progressionFamiliesEnabled).toBe(true);
  });

  it("resolveExpertiseFilter respects progressionFamiliesEnabled false", () => {
    const filter = resolveExpertiseFilter({
      progressionFamiliesEnabled: false,
    });
    expect(filter.progressionFamiliesEnabled).toBe(false);
  });

  it("caps expert handstand pushup for novice push", () => {
    const hc = exerciseMap["HC-184"];
    expect(hc?.expertiseLevel).toBe("expert");
    const filter = resolveExpertiseFilter({
      expertiseByGroup: NOVICE_PUSH,
    });
    expect(
      exerciseMeetsExpertiseCap(hc!, "UP", filter.byGroup),
    ).toBe(false);
  });
});
