import { describe, expect, it } from "vitest";
import {
  exerciseSupportsLoad,
  formatLoadPrescription,
  initialLoggedWeightLb,
  inventoryKindForExercise,
  parseWeightFieldDraft,
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

  it("parses weight field drafts for commit", () => {
    expect(parseWeightFieldDraft("")).toBeUndefined();
    expect(parseWeightFieldDraft("  ")).toBeUndefined();
    expect(parseWeightFieldDraft("0")).toBeUndefined();
    expect(parseWeightFieldDraft("0.0")).toBeUndefined();
    expect(parseWeightFieldDraft("15")).toBe(15);
    expect(parseWeightFieldDraft("12.5")).toBe(12.5);
    expect(parseWeightFieldDraft("12.")).toBe(12);
    expect(parseWeightFieldDraft("abc")).toBe("invalid");
    expect(parseWeightFieldDraft("-5")).toBe("invalid");
  });

  it("preselects library default only for loadable exercises", () => {
    expect(initialLoggedWeightLb({ equipment: ["dumbbell"] }, 20)).toBe(20);
    expect(initialLoggedWeightLb({ equipment: ["bodyweight"] }, 20)).toBeUndefined();
    expect(initialLoggedWeightLb({ equipment: ["dumbbell"] }, null)).toBeUndefined();
    expect(initialLoggedWeightLb(null, 20)).toBeUndefined();
  });
});
