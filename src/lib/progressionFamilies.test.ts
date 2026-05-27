import { describe, expect, it } from "vitest";
import { exerciseMap, exercises } from "@/data/exercises";
import {
  PROGRESSION_FAMILIES,
  progressionByExerciseId,
} from "@/lib/progressionFamilies";

describe("progressionFamilies manifest", () => {
  it("references only catalog exercise ids", () => {
    for (const family of PROGRESSION_FAMILIES) {
      for (const entry of family.entries) {
        expect(
          exerciseMap[entry.exerciseId],
          `${family.id} → missing ${entry.exerciseId}`,
        ).toBeDefined();
      }
    }
  });

  it("assigns each exercise to at most one family", () => {
    expect(progressionByExerciseId.size).toBeGreaterThan(20);
    const withMeta = exercises.filter((e) => e.progressionFamilyId);
    expect(withMeta.length).toBe(progressionByExerciseId.size);
  });

  it("merges metadata onto exercises export", () => {
    expect(exerciseMap["UP-1"]?.progressionFamilyId).toBe("push_horizontal");
    expect(exerciseMap["UP-1"]?.progressionStep).toBe(2);
    expect(exerciseMap["HC-226"]?.progressionStep).toBe(3);
  });
});
