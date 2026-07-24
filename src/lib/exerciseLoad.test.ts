import { describe, expect, it } from "vitest";
import {
  exerciseSupportsLoad,
  formatLoadPrescription,
  inventoryKindForExercise,
} from "@/lib/exerciseLoad";

describe("exerciseLoad", () => {
  it("detects loadable equipment", () => {
    expect(exerciseSupportsLoad(["dumbbell"])).toBe(true);
    expect(exerciseSupportsLoad(["cable", "bodyweight"])).toBe(true);
    expect(exerciseSupportsLoad(["bodyweight"])).toBe(false);
    expect(exerciseSupportsLoad(undefined)).toBe(false);
  });

  it("picks inventory kind from equipment", () => {
    expect(inventoryKindForExercise(["dumbbell", "bench"])).toBe("dumbbell");
    expect(inventoryKindForExercise(["barbell"])).toBe("barbell");
    expect(inventoryKindForExercise(["cable"])).toBeNull();
  });

  it("formats load into prescription text", () => {
    expect(formatLoadPrescription("12", 15)).toBe("12 @ 15 lb");
    expect(formatLoadPrescription("10", 2.5)).toBe("10 @ 2.5 lb");
    expect(formatLoadPrescription("12", null)).toBe("12");
  });
});
