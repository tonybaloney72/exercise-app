import { describe, expect, it } from "vitest";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { getStretchCandidates } from "@/lib/planStretchCandidates";
import { getStretchSwapCandidates } from "@/lib/stretchSwap";

const equipment = [...DEFAULT_AVAILABLE_EQUIPMENT];

describe("getStretchCandidates", () => {
  it("warm-up pool includes cool-down (SC) and workout crossover stretches", () => {
    const ids = new Set(
      getStretchCandidates({
        section: "warmUp",
        usedExerciseIds: new Set(),
        availableEquipment: equipment,
      }).map((e) => e.id),
    );
    expect(ids.has("SW-1")).toBe(true);
    expect(ids.has("SC-15")).toBe(true);
    expect(ids.has("PC-1")).toBe(true);
    expect(ids.has("CS-3")).toBe(true);
  });

  it("cool-down pool is SC-only", () => {
    const candidates = getStretchCandidates({
      section: "coolDown",
      usedExerciseIds: new Set(),
      availableEquipment: equipment,
    });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((e) => e.category === "SC")).toBe(true);
    expect(candidates.some((e) => e.id === "SW-1")).toBe(false);
    expect(candidates.some((e) => e.id === "PC-1")).toBe(false);
  });

  it("excludes used ids from warm-up candidates", () => {
    const ids = getStretchCandidates({
      section: "warmUp",
      usedExerciseIds: new Set(["SC-15", "PC-1"]),
      availableEquipment: equipment,
    }).map((e) => e.id);
    expect(ids).not.toContain("SC-15");
    expect(ids).not.toContain("PC-1");
  });
});

describe("getStretchSwapCandidates", () => {
  it("warm-up swap can replace into an SC stretch", () => {
    const ids = new Set(
      getStretchSwapCandidates({
        section: "warmUp",
        currentExerciseId: "SW-1",
        usedExerciseIds: new Set(["SW-1"]),
        availableEquipment: equipment,
      }).map((e) => e.id),
    );
    expect(ids.has("SW-1")).toBe(false);
    expect(ids.has("SC-15")).toBe(true);
  });
});
