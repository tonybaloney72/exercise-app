import { describe, expect, it } from "vitest";
import {
  categoryMuscleGroups,
  resolveMuscleGroups,
} from "./category-muscle-groups.mjs";

describe("categoryMuscleGroups", () => {
  it("does not stamp biceps onto upper push defaults", () => {
    expect(categoryMuscleGroups("UP")).not.toContain("Biceps");
    expect(categoryMuscleGroups("UP")).toEqual(
      expect.arrayContaining([
        "Chest",
        "Front Deltoids",
        "Triceps",
        "Serratus Anterior",
      ]),
    );
  });

  it("includes biceps on upper pull defaults", () => {
    expect(categoryMuscleGroups("UPL")).toContain("Biceps");
  });

  it("merges secondary category muscles", () => {
    const groups = categoryMuscleGroups("CL", "UPL");
    expect(groups).toContain("Hip Flexors");
    expect(groups).toContain("Lats");
  });
});

describe("resolveMuscleGroups", () => {
  it("adds push muscles and name inference for catalog push-ups", () => {
    const groups = resolveMuscleGroups({
      name: "Knee Push-Up",
      category: "UP",
      source: "catalog",
    });
    expect(groups).not.toContain("Biceps");
    expect(groups).toContain("Chest");
    expect(groups).toContain("Triceps");
  });

  it("preserves hybrid tags while adding category defaults", () => {
    const groups = resolveMuscleGroups({
      name: "45 Degree Back Raise",
      category: "CS",
      existingMuscleGroups: ["Spinal Erectors"],
      source: "hybrid",
    });
    expect(groups).toContain("Spinal Erectors");
    expect(groups).toContain("Glutes");
    expect(groups).toContain("Hamstrings");
  });
});
