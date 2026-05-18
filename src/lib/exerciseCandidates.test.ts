import { describe, expect, it } from "vitest";
import { exercises } from "@/data/exercises";
import {
  collectDislikedIds,
  pickDislikeReplacement,
  pickReplacementCandidate,
} from "@/lib/exerciseCandidates";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";

describe("exerciseCandidates", () => {
  it("collects disliked ids from prefs map", () => {
    const ids = collectDislikedIds({
      "UP-1": "disliked",
      "LB-2": "favorite",
    });
    expect([...ids]).toEqual(["UP-1"]);
  });

  it("prefers favorites when picking a replacement", () => {
    const candidates = exercises.filter((ex) => ex.id === "UP-2" || ex.id === "UP-3");
    const pick = pickReplacementCandidate(candidates, new Set(["UP-3"]), "seed");
    expect(pick?.id).toBe("UP-3");
  });

  it("different seeds can change the pick among non-favorites", () => {
    const candidates = exercises.filter((ex) => ex.category === "CF").slice(0, 8);
    expect(candidates.length).toBeGreaterThan(2);
    const a = pickReplacementCandidate(candidates, new Set(), "week-a");
    const b = pickReplacementCandidate(candidates, new Set(), "week-b");
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.id).not.toBe(b!.id);
  });

  it("picks a deterministic substitute for a disliked slot", () => {
    const substitute = pickDislikeReplacement({
      category: "UP",
      excludeExerciseIds: new Set(["UP-1"]),
      availableEquipment: DEFAULT_AVAILABLE_EQUIPMENT,
      dislikedExerciseIds: new Set(["UP-1"]),
      seed: "dislike:UP-1",
    });
    expect(substitute).not.toBeNull();
    expect(substitute!.id).not.toBe("UP-1");
    expect(substitute!.category).toBe("UP");
  });
});
