import { describe, expect, it } from "vitest";
import { reorderRoundExercises } from "@/lib/reorderRoundExercises";
import type { RoundExercise } from "@/types";

const slot = (id: string): RoundExercise => ({
  exerciseId: id,
  targetReps: "10",
  category: "UP",
});

describe("reorderRoundExercises", () => {
  it("moves an item down", () => {
    const list = [slot("a"), slot("b"), slot("c")];
    expect(reorderRoundExercises(list, 0, 2).map((e) => e.exerciseId)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("moves an item up", () => {
    const list = [slot("a"), slot("b"), slot("c")];
    expect(reorderRoundExercises(list, 2, 0).map((e) => e.exerciseId)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("no-ops on invalid indices", () => {
    const list = [slot("a")];
    expect(reorderRoundExercises(list, 0, 0)).toBe(list);
    expect(reorderRoundExercises(list, -1, 0)).toBe(list);
    expect(reorderRoundExercises(list, 0, 3)).toBe(list);
  });
});
