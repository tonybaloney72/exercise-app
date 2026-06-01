import { describe, expect, it } from "vitest";
import type { ExpertiseLevel } from "@/types";
import { exerciseMap } from "@/data/exercises";

const LEVEL_RANK: Record<ExpertiseLevel, number> = {
  beginner: 0,
  novice: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

/** Curated bodyweight push-up ladder (both catalog files). */
const PUSH_UP_PROGRESSION: Record<
  string,
  { level: ExpertiseLevel; category?: "UP" }
> = {
  "PC-38": { level: "beginner", category: "UP" },
  "UP-6": { level: "novice" },
  "UP-1": { level: "intermediate" },
  "UP-2": { level: "intermediate" },
  "UP-4": { level: "intermediate" },
  "UP-7": { level: "intermediate" },
  "UP-3": { level: "intermediate" },
  "HC-226": { level: "advanced" },
  "UP-25": { level: "advanced" },
  "HC-125": { level: "advanced" },
  "HC-220": { level: "advanced" },
  "HC-135": { level: "advanced" },
  "HC-184": { level: "expert" },
  "HC-224": { level: "expert" },
};

describe("upper push bodyweight progression levels", () => {
  it("matches curated expertiseLevel (and PC-38 category)", () => {
    for (const [id, spec] of Object.entries(PUSH_UP_PROGRESSION)) {
      const ex = exerciseMap[id];
      expect(ex, `missing exercise ${id}`).toBeDefined();
      expect(ex?.expertiseLevel, id).toBe(spec.level);
      if (spec.category) {
        expect(ex?.category, id).toBe(spec.category);
      }
    }
  });

  it("orders easier variants below harder ones on the ladder", () => {
    const orderedIds = [
      "PC-38",
      "UP-6",
      "UP-1",
      "HC-226",
      "UP-25",
      "HC-220",
      "HC-184",
    ];
    for (let i = 1; i < orderedIds.length; i++) {
      const prev = exerciseMap[orderedIds[i - 1]!]?.expertiseLevel;
      const curr = exerciseMap[orderedIds[i]!]?.expertiseLevel;
      expect(LEVEL_RANK[prev!]).toBeLessThanOrEqual(LEVEL_RANK[curr!]);
    }
  });
});
