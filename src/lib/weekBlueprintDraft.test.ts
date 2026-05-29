import { describe, expect, it } from "vitest";
import {
  addRoundInBlueprint,
  DEFAULT_ACTIVE_RECOVERY_ROUND_COUNT,
  DEFAULT_WORKOUT_ROUND_COUNT,
  setDayKindInBlueprint,
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
