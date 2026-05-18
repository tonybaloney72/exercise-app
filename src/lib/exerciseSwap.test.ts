import { describe, expect, it } from "vitest";
import {
  formatLaterRoundWarning,
  laterRoundOccurrencesByExerciseId,
} from "@/lib/exerciseSwap";

describe("laterRoundOccurrencesByExerciseId", () => {
  it("maps exercise ids to later round numbers only", () => {
    const map = laterRoundOccurrencesByExerciseId(
      [
        { roundNumber: 1, exerciseIds: ["A", "B"] },
        { roundNumber: 2, exerciseIds: ["B", "C"] },
        { roundNumber: 3, exerciseIds: ["A"] },
      ],
      1,
    );
    expect(map.get("B")).toEqual([2]);
    expect(map.get("C")).toEqual([2]);
    expect(map.get("A")).toEqual([3]);
    expect(map.has("A")).toBe(true);
  });

  it("returns empty when no later rounds", () => {
    const map = laterRoundOccurrencesByExerciseId(
      [{ roundNumber: 1, exerciseIds: ["A"] }],
      1,
    );
    expect(map.size).toBe(0);
  });
});

describe("formatLaterRoundWarning", () => {
  it("formats single and multiple rounds", () => {
    expect(formatLaterRoundWarning([3])).toBe("Also scheduled in Round 3");
    expect(formatLaterRoundWarning([2, 4])).toBe(
      "Also scheduled in Rounds 2 & 4",
    );
    expect(formatLaterRoundWarning([1, 2, 4])).toBe(
      "Also scheduled in Rounds 1, 2, & 4",
    );
  });
});
