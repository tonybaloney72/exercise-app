import { describe, expect, it } from "vitest";
import {
  categoryPriorityScore,
  trainingPriorityFingerprint,
  TRAINING_PRIORITY_PRESET_WEIGHTS,
  weightsForPreset,
} from "@/lib/trainingPriorities";

describe("trainingPriorities", () => {
  it("balanced preset uses equal weights summing to 10", () => {
    const w = weightsForPreset("balanced");
    expect(w.core + w.cardio + w.lower + w.upper_push + w.upper_pull).toBe(10);
    expect(w.core).toBe(2);
    expect(w.upper_pull).toBe(2);
  });

  it("core emphasis scores core above upper push", () => {
    const w = weightsForPreset("core_emphasis");
    expect(categoryPriorityScore("CF", w)).toBeGreaterThan(
      categoryPriorityScore("UP", w),
    );
  });

  it("fingerprint encodes preset and weights", () => {
    expect(trainingPriorityFingerprint("balanced")).toBe("tp:balanced|2,2,2,2,2");
    expect(trainingPriorityFingerprint("core_emphasis")).toBe(
      "tp:core_emphasis|4,2,2,1,1",
    );
  });

  it("defines weights for every preset", () => {
    const presets = Object.keys(TRAINING_PRIORITY_PRESET_WEIGHTS);
    expect(presets.length).toBe(7);
    for (const p of presets) {
      const w = weightsForPreset(p as keyof typeof TRAINING_PRIORITY_PRESET_WEIGHTS);
      const sum =
        w.core + w.cardio + w.lower + w.upper_push + w.upper_pull;
      expect(sum).toBe(10);
    }
  });
});
