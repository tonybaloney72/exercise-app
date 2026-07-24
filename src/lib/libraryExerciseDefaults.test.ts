import { describe, expect, it } from "vitest";
import {
  parseLibraryDefaultRepsInput,
  parseLibraryDefaultWeightInput,
  buildLibraryWeightSettings,
} from "@/lib/libraryExerciseDefaults";
import { buildExerciseSettingsAfterRepIncreaseAccept } from "@/lib/applyRepIncreaseSuggestion";

describe("libraryExerciseDefaults", () => {
  it("parses and clears default reps", () => {
    expect(parseLibraryDefaultRepsInput("", "10")).toBeNull();
    expect(parseLibraryDefaultRepsInput("12", "10")).toBe(12);
    expect(parseLibraryDefaultRepsInput("nope", "8")).toBe(8);
  });

  it("parses and clears default weight", () => {
    expect(parseLibraryDefaultWeightInput("")).toBeNull();
    expect(parseLibraryDefaultWeightInput("15")).toBe(15);
    expect(parseLibraryDefaultWeightInput("2.5")).toBe(2.5);
    expect(parseLibraryDefaultWeightInput("x")).toBeUndefined();
  });

  it("builds library weight settings payload", () => {
    expect(
      buildLibraryWeightSettings(
        "reps",
        { defaultSetMode: "reps", defaultTargetReps: 10 },
        20,
      ),
    ).toEqual({
      defaultSetMode: "reps",
      defaultTimerSeconds: null,
      defaultTargetReps: 10,
      defaultWeightLb: 20,
    });
  });
});

describe("buildExerciseSettingsAfterRepIncreaseAccept", () => {
  it("applies rep, timer, and load accepts", () => {
    expect(
      buildExerciseSettingsAfterRepIncreaseAccept(
        "x",
        {
          exerciseId: "x",
          mode: "reps",
          currentTarget: 10,
          suggestedTarget: 12,
          reason: "t",
        },
        { defaultSetMode: "reps", defaultWeightLb: 5 },
        "2026-07-02",
      ),
    ).toMatchObject({
      defaultSetMode: "reps",
      defaultTargetReps: 12,
      defaultWeightLb: 5,
    });

    expect(
      buildExerciseSettingsAfterRepIncreaseAccept(
        "x",
        {
          exerciseId: "x",
          mode: "timer",
          currentTarget: 30,
          suggestedTarget: 45,
          reason: "t",
        },
        { defaultSetMode: "timer" },
        "2026-07-02",
      ),
    ).toMatchObject({
      defaultSetMode: "timer",
      defaultTimerSeconds: 45,
    });

    expect(
      buildExerciseSettingsAfterRepIncreaseAccept(
        "x",
        {
          exerciseId: "x",
          mode: "load",
          currentTarget: 12,
          suggestedTarget: 8,
          currentWeightLb: 5,
          suggestedWeightLb: 10,
          reason: "t",
        },
        { defaultSetMode: "reps", defaultTargetReps: 12, defaultWeightLb: 5 },
        "2026-07-02",
      ),
    ).toMatchObject({
      defaultSetMode: "reps",
      defaultTargetReps: 8,
      defaultWeightLb: 10,
    });
  });
});
