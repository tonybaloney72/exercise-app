import { describe, expect, it } from "vitest";
import {
  exerciseMap,
  getExercise,
  getExerciseCategory,
  listExercises,
} from "@/core/catalog";

describe("core catalog API", () => {
  it("getExercise resolves catalog and legacy CP alias", () => {
    const pc = getExercise("PC-1");
    expect(pc?.name).toBeTruthy();
    const legacy = getExercise("CP-1");
    expect(legacy?.id).toBe("PC-1");
    expect(exerciseMap["CP-1"]?.id).toBe("PC-1");
  });

  it("listExercises matches exerciseMap size (excluding alias keys)", () => {
    expect(listExercises().length).toBeGreaterThan(500);
    expect(getExerciseCategory("CF-1")).toBe("CF");
  });
});
