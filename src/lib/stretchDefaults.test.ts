import { describe, expect, it } from "vitest";
import {
  dedupeStretchEntries,
  normalizeStretchList,
  stretchListsEqual,
} from "@/lib/stretchDefaults";
import type { StretchEntry } from "@/types";

describe("stretchDefaults", () => {
  it("dedupes stretch entries by exercise id", () => {
    const entries: StretchEntry[] = [
      { exerciseId: "SW-1", targetReps: "10" },
      { exerciseId: "SW-1", targetReps: "12" },
      { exerciseId: "SW-2", targetReps: "8" },
    ];
    expect(dedupeStretchEntries(entries).map((e) => e.exerciseId)).toEqual([
      "SW-1",
      "SW-2",
    ]);
  });

  it("normalizes lists and removes disliked ids", () => {
    const entries: StretchEntry[] = [
      { exerciseId: "SW-1", targetReps: "10" },
      { exerciseId: "SW-2", targetReps: "8" },
    ];
    const out = normalizeStretchList(entries, new Set(["SW-2"]));
    expect(out.map((e) => e.exerciseId)).toEqual(["SW-1"]);
  });

  it("compares stretch lists by exercise id and reps", () => {
    const left: StretchEntry[] = [{ exerciseId: "SW-1", targetReps: "10" }];
    const right: StretchEntry[] = [{ exerciseId: "SW-1", targetReps: "10" }];
    const different: StretchEntry[] = [{ exerciseId: "SW-1", targetReps: "12" }];
    expect(stretchListsEqual(left, right)).toBe(true);
    expect(stretchListsEqual(left, different)).toBe(false);
  });
});
