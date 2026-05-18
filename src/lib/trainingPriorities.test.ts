import { describe, expect, it } from "vitest";
import {
  categoryPriorityScore,
  describeTrainingPriorityScores,
  scoresEqual,
  scoresFromPreset,
  sanitizeTrainingPriorityScores,
  trainingPriorityFingerprint,
  TRAINING_PRIORITY_PRESET_WEIGHTS,
  weightsForPreset,
} from "@/lib/trainingPriorities";

describe("trainingPriorities", () => {
  it("balanced preset uses equal scores of 2", () => {
    const scores = scoresFromPreset("balanced");
    expect(scores.core + scores.cardio + scores.lower + scores.upper_push + scores.upper_pull).toBe(10);
    expect(scores.core).toBe(2);
    expect(scores.upper_pull).toBe(2);
  });

  it("core emphasis scores core above upper push", () => {
    const scores = scoresFromPreset("core_emphasis");
    expect(scores.core).toBeGreaterThan(scores.upper_push);
  });

  it("fingerprint encodes preset and scores", () => {
    const scores = scoresFromPreset("balanced");
    expect(trainingPriorityFingerprint("balanced", scores, false)).toBe(
      "tp:balanced|2,2,2,2,2",
    );
    expect(trainingPriorityFingerprint("balanced", scores, true)).toBe(
      "tp:custom|2,2,2,2,2",
    );
  });

  it("defines preset weights that map to 0–4 scores summing to 10", () => {
    const presets = Object.keys(TRAINING_PRIORITY_PRESET_WEIGHTS);
    expect(presets.length).toBe(7);
    for (const p of presets) {
      const scores = scoresFromPreset(p as keyof typeof TRAINING_PRIORITY_PRESET_WEIGHTS);
      const sum =
        scores.core + scores.cardio + scores.lower + scores.upper_push + scores.upper_pull;
      expect(sum).toBe(10);
      for (const g of Object.keys(scores) as (keyof typeof scores)[]) {
        expect(scores[g]).toBeGreaterThanOrEqual(0);
        expect(scores[g]).toBeLessThanOrEqual(4);
      }
    }
  });

  it("sanitize clamps scores to 0–4", () => {
    const scores = sanitizeTrainingPriorityScores({
      core: 9,
      cardio: -1,
      lower: 2,
      upper_push: 3,
      upper_pull: 1,
    });
    expect(scores.core).toBe(4);
    expect(scores.cardio).toBe(0);
  });

  it("categoryPriorityScore returns 0 for skipped groups", () => {
    const w = weightsForPreset("balanced");
    w.core = 0;
    expect(categoryPriorityScore("CF", w)).toBe(0);
  });

  it("describeTrainingPriorityScores mentions strong groups", () => {
    const text = describeTrainingPriorityScores(scoresFromPreset("core_emphasis"));
    expect(text.toLowerCase()).toContain("core");
  });

  it("scoresEqual detects matching vectors", () => {
    expect(scoresEqual(scoresFromPreset("balanced"), scoresFromPreset("balanced"))).toBe(
      true,
    );
    expect(scoresEqual(scoresFromPreset("balanced"), scoresFromPreset("upper_body"))).toBe(
      false,
    );
  });
});
