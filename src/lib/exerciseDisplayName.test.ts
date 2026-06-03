import { describe, expect, it } from "vitest";
import {
  normalizeExerciseId,
  resolveExerciseDisplayName,
} from "@/lib/exerciseDisplayName";

describe("exerciseDisplayName", () => {
  it("normalizes lowercase catalog-style ids", () => {
    expect(normalizeExerciseId("pc-41")).toBe("PC-41");
  });

  it("uses archived names for removed catalog entries", () => {
    expect(resolveExerciseDisplayName("PC-40")).toBe("Incline Plyo Push-Up");
    expect(resolveExerciseDisplayName("pc-41")).toBe("Clap Push-Up");
  });

  it("uses live catalog names when present", () => {
    expect(resolveExerciseDisplayName("UP-8")).toBe("Clap Push-Up");
  });
});
