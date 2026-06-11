import { describe, expect, it } from "vitest";
import {
  addRoundInBlueprint,
  applyRoundCloneFromPrior,
  copyDayInBlueprint,
  insertRoundInBlueprint,
  MAX_BLUEPRINT_ROUNDS,
  DEFAULT_ACTIVE_RECOVERY_ROUND_COUNT,
  DEFAULT_WORKOUT_ROUND_COUNT,
  setDayCardioInBlueprint,
  setDayKindInBlueprint,
  setRoundExerciseCount,
  shortDayBlueprintLabel,
} from "@/lib/weekBlueprintDraft";

describe("weekBlueprintDraft", () => {
  it("defaults workout days to three rounds", () => {
    const next = setDayKindInBlueprint({}, 1, "workout");
    expect(next[1]?.rounds).toHaveLength(DEFAULT_WORKOUT_ROUND_COUNT);
  });

  it("defaults active recovery to one round", () => {
    const next = setDayKindInBlueprint({}, 2, "active_recovery");
    expect(next[2]?.rounds).toHaveLength(DEFAULT_ACTIVE_RECOVERY_ROUND_COUNT);
  });

  it("addRoundInBlueprint appends a round copying the last", () => {
    const base = setDayKindInBlueprint({}, 0, "workout");
    const next = addRoundInBlueprint(base, 0);
    expect(next[0]?.rounds).toHaveLength(DEFAULT_WORKOUT_ROUND_COUNT + 1);
    expect(next[0]?.rounds.at(-1)?.groups).toEqual(
      next[0]?.rounds.at(-2)?.groups,
    );
  });

  it("insertRoundInBlueprint inserts between existing rounds", () => {
    const base = setDayKindInBlueprint({}, 0, "workout");
    const inserted = insertRoundInBlueprint(base, 0, 1);
    expect(inserted[0]?.rounds).toHaveLength(DEFAULT_WORKOUT_ROUND_COUNT + 1);
    expect(inserted[0]?.rounds[1]?.groups).toEqual(
      inserted[0]?.rounds[0]?.groups,
    );
  });

  it("insertRoundInBlueprint remaps clone indices when inserting at start", () => {
    let blueprint = setDayKindInBlueprint({}, 0, "workout");
    blueprint = applyRoundCloneFromPrior(blueprint, 0, 1, "repeat");
    const inserted = insertRoundInBlueprint(blueprint, 0, 0);
    expect(inserted[0]?.rounds).toHaveLength(DEFAULT_WORKOUT_ROUND_COUNT + 1);
    expect(inserted[0]?.rounds[2]?.cloneOfRoundIndex).toBe(1);
    expect(inserted[0]?.rounds[2]?.cloneMode).toBe("repeat");
  });

  it("insertRoundInBlueprint is a no-op at max rounds", () => {
    let blueprint = setDayKindInBlueprint({}, 0, "workout");
    for (let i = 0; i < 3; i++) {
      blueprint = addRoundInBlueprint(blueprint, 0);
    }
    expect(blueprint[0]?.rounds).toHaveLength(MAX_BLUEPRINT_ROUNDS);
    const blocked = insertRoundInBlueprint(blueprint, 0, 1);
    expect(blocked).toBe(blueprint);
  });

  it("copyDayInBlueprint deep-copies source onto target", () => {
    let blueprint = setDayKindInBlueprint({}, 1, "workout");
    blueprint = setRoundExerciseCount(blueprint, 1, 0, 12);
    blueprint = setDayCardioInBlueprint(blueprint, 1, ["jog"]);

    const copied = copyDayInBlueprint(blueprint, 3, 1);
    expect(copied[3]?.dayKind).toBe("workout");
    expect(copied[3]?.rounds[0]?.exerciseCount).toBe(12);
    expect(copied[3]?.cardio).toEqual(["jog"]);

    const mutated = setRoundExerciseCount(copied, 3, 0, 5);
    expect(mutated[3]?.rounds[0]?.exerciseCount).toBe(5);
    expect(mutated[1]?.rounds[0]?.exerciseCount).toBe(12);
  });

  it("copyDayInBlueprint is a no-op when source and target are the same", () => {
    const blueprint = setDayKindInBlueprint({}, 1, "full_rest");
    expect(copyDayInBlueprint(blueprint, 1, 1)).toBe(blueprint);
  });

  it("copyDayInBlueprint preserves round clone metadata", () => {
    let blueprint = setDayKindInBlueprint({}, 0, "workout");
    blueprint = applyRoundCloneFromPrior(blueprint, 0, 1, "repeat");
    const copied = copyDayInBlueprint(blueprint, 2, 0);
    expect(copied[2]?.rounds[1]?.cloneOfRoundIndex).toBe(0);
    expect(copied[2]?.rounds[1]?.cloneMode).toBe("repeat");
  });

  it("copyDayInBlueprint copies rest and stretch days", () => {
    const blueprint = setDayKindInBlueprint({}, 4, "stretches");
    const copied = copyDayInBlueprint(blueprint, 5, 4);
    expect(copied[5]?.dayKind).toBe("stretches");
    expect(copied[5]?.rounds).toEqual([]);
    expect(copied[5]?.cardio).toEqual([]);
  });

  it("shortDayBlueprintLabel stays compact for the day strip", () => {
    expect(
      shortDayBlueprintLabel({ dayKind: "full_rest", rounds: [] }),
    ).toBe("Rest");
    expect(
      shortDayBlueprintLabel({
        dayKind: "workout",
        rounds: [{ groups: ["upper_push"] }, { groups: ["lower"] }, { groups: ["upper_pull"] }],
      }),
    ).toBe("3 rnd");
    expect(
      shortDayBlueprintLabel({
        dayKind: "active_recovery",
        rounds: [{ groups: ["lower"] }],
      }),
    ).toBe("AR");
  });
});
