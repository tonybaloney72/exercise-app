import { describe, expect, it } from "vitest";
import {
  applyLibraryTargetsToDayPlan,
  applyLibraryTargetsToStretchEntries,
  dedupeStretchEntries,
  normalizeStretchList,
  stretchEntryFromExerciseId,
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

  it("applyLibraryTargetsToStretchEntries uses Library timer over catalog text", () => {
    const out = applyLibraryTargetsToStretchEntries(
      [{ exerciseId: "SC-9", targetReps: "20 sec each leg" }],
      {
        "SC-9": {
          defaultSetMode: "timer",
          defaultTimerSeconds: 45,
        },
      },
    );
    expect(out[0]?.targetReps).toBe("45 sec");
  });

  it("stretchEntryFromExerciseId uses Library timer when set", () => {
    const entry = stretchEntryFromExerciseId("SC-9", {
      "SC-9": {
        defaultSetMode: "timer",
        defaultTimerSeconds: 45,
      },
    });
    expect(entry?.targetReps).toBe("45 sec");
  });

  it("applyLibraryTargetsToDayPlan updates stretch and round targets", () => {
    const plan = applyLibraryTargetsToDayPlan(
      {
        dayOfWeek: 1,
        name: "Mon",
        theme: "",
        hasJog: false,
        strengthFocus: [],
        coreGroups: [],
        rounds: [
          {
            roundNumber: 1,
            exercises: [
              { exerciseId: "PC-1", category: "PC", targetReps: "8" },
            ],
          },
        ],
        coolDown: [{ exerciseId: "SC-9", targetReps: "20 sec each leg" }],
      },
      {
        "SC-9": { defaultSetMode: "timer", defaultTimerSeconds: 45 },
      },
    );
    expect(plan.coolDown?.[0]?.targetReps).toBe("45 sec");
  });
});
