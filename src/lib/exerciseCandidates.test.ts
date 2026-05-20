import { describe, expect, it } from "vitest";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { getReplacementCandidates } from "@/lib/exerciseCandidates";

describe("getReplacementCandidates", () => {
  it("excludes END-* cardio block ids from PC round pool", () => {
    const candidates = getReplacementCandidates({
      category: "PC",
      excludeExerciseIds: new Set(),
      availableEquipment: [...DEFAULT_AVAILABLE_EQUIPMENT, "bicycle"],
    });
    expect(candidates.some((e) => e.id.startsWith("END-"))).toBe(false);
  });

  it("excludes deprecated ids such as PC-3", () => {
    const candidates = getReplacementCandidates({
      category: "PC",
      excludeExerciseIds: new Set(),
      availableEquipment: [...DEFAULT_AVAILABLE_EQUIPMENT],
    });
    expect(candidates.some((e) => e.id === "PC-3")).toBe(false);
  });
});
