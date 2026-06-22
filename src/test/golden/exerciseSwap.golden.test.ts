import { describe, expect, it } from "vitest";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { getSwapCandidates } from "@/lib/exerciseSwap";
import { GOLDEN_EQUIPMENT } from "./fixtures";

/**
 * Behavior contract: swap candidate pools are deterministic for a fixed slot context.
 */
describe("exerciseSwap golden contract", () => {
  const roundExercises = [
    { exerciseId: "UP-1", completed: false, skipped: false },
    { exerciseId: "UP-2", completed: false, skipped: false },
  ];

  it("locks sorted swap candidate ids for a canonical UP slot", () => {
    const candidates = getSwapCandidates("UP", "UP-1", roundExercises, 0, {
      availableEquipment: GOLDEN_EQUIPMENT,
      dislikedExerciseIds: new Set(),
    });
    const ids = candidates.map((e) => e.id).sort();
    expect(ids).toMatchInlineSnapshot(`
      [
        "HC-010",
        "HC-014",
        "HC-022",
        "HC-024",
        "HC-025",
        "HC-027",
        "HC-048",
        "HC-049",
        "HC-054",
        "HC-055",
        "HC-057",
        "HC-125",
        "HC-126",
        "HC-135",
        "HC-138",
        "HC-184",
        "HC-220",
        "HC-222",
        "HC-224",
        "HC-226",
        "HC-270",
        "HC-272",
        "PC-38",
        "UP-25",
        "UP-3",
        "UP-4",
        "UP-5",
        "UP-6",
        "UP-7",
      ]
    `);
  });

  it("never returns disliked exercises in swap candidates", () => {
    const disliked = collectDislikedIds({ "UP-5": "disliked", "UP-6": "disliked" });
    const candidates = getSwapCandidates("UP", "UP-1", roundExercises, 0, {
      availableEquipment: GOLDEN_EQUIPMENT,
      dislikedExerciseIds: disliked,
    });
    const ids = new Set(candidates.map((e) => e.id));
    expect(ids.has("UP-5")).toBe(false);
    expect(ids.has("UP-6")).toBe(false);
  });

  it("excludes exercises already effective in the round", () => {
    const swappedRound = [
      { exerciseId: "UP-1", completed: false, skipped: false },
      { exerciseId: "UP-99", swappedWith: "UP-3", completed: false, skipped: false },
    ];
    const candidates = getSwapCandidates("UP", "UP-1", swappedRound, 0, {
      availableEquipment: GOLDEN_EQUIPMENT,
      dislikedExerciseIds: new Set(),
    });
    const ids = candidates.map((e) => e.id);
    expect(ids).not.toContain("UP-1");
    expect(ids).not.toContain("UP-3");
  });
});
