import { describe, expect, it } from "vitest";
import { TRAINING_CATEGORY_ORDER } from "@/core/catalog";
import { getSwapCandidates, getSwapCandidatesAllCategories } from "@/lib/exerciseSwap";
import { getPlanSlotCandidatesAllCategories } from "@/lib/planSlotCandidates";
import { GOLDEN_EQUIPMENT } from "@/test/golden/fixtures";

describe("getSwapCandidatesAllCategories", () => {
  const roundExercises = [
    { exerciseId: "UP-1", completed: false, skipped: false },
    { exerciseId: "UP-2", completed: false, skipped: false },
  ];

  it("includes candidates outside the prescribed category", () => {
    const sameCategory = getSwapCandidates("UP", "UP-1", roundExercises, 0, {
      availableEquipment: GOLDEN_EQUIPMENT,
      dislikedExerciseIds: new Set(),
    });
    const allCategories = getSwapCandidatesAllCategories(
      TRAINING_CATEGORY_ORDER,
      "UP-1",
      roundExercises,
      0,
      {
        availableEquipment: GOLDEN_EQUIPMENT,
        dislikedExerciseIds: new Set(),
      },
    );

    expect(allCategories.length).toBeGreaterThan(sameCategory.length);
    expect(allCategories.some((ex) => ex.category !== "UP")).toBe(true);
    expect(allCategories.some((ex) => ex.id === "UP-1")).toBe(false);
    expect(allCategories.some((ex) => ex.id === "UP-2")).toBe(false);
  });
});

describe("getPlanSlotCandidatesAllCategories", () => {
  it("merges training categories for plan editor swaps", () => {
    const candidates = getPlanSlotCandidatesAllCategories({
      categories: TRAINING_CATEGORY_ORDER,
      plannedExerciseId: "UP-1",
      roundExerciseIds: ["UP-1", "LB-1"],
      slotIndex: 0,
      availableEquipment: GOLDEN_EQUIPMENT,
      dislikedExerciseIds: new Set(),
    });
    expect(candidates.some((ex) => ex.category === "UP")).toBe(true);
    expect(candidates.some((ex) => ex.category === "LB")).toBe(true);
    expect(candidates.some((ex) => ex.id === "UP-1")).toBe(false);
    expect(candidates.some((ex) => ex.id === "LB-1")).toBe(false);
  });
});
