import { describe, expect, it } from "vitest";
import { analyzeWeekBlueprint } from "@/lib/weekBlueprintWarnings";

describe("analyzeWeekBlueprint", () => {
  it("warns when no light day in the week", () => {
    const warnings = analyzeWeekBlueprint({
      0: { dayKind: "workout", rounds: [{ groups: ["upper_push"] }] },
      1: { dayKind: "workout", rounds: [{ groups: ["upper_pull"] }] },
      2: { dayKind: "workout", rounds: [{ groups: ["lower"] }] },
      3: { dayKind: "workout", rounds: [{ groups: ["upper_push"] }] },
      4: { dayKind: "workout", rounds: [{ groups: ["upper_pull"] }] },
      5: { dayKind: "workout", rounds: [{ groups: ["lower"] }] },
      6: { dayKind: "workout", rounds: [{ groups: ["upper_push"] }] },
    });
    expect(warnings.some((w) => w.id === "no-light-day")).toBe(true);
  });

  it("warns on empty round groups for a workout day", () => {
    const warnings = analyzeWeekBlueprint({
      1: { dayKind: "workout", rounds: [{ groups: [] }] },
      6: { dayKind: "full_rest", rounds: [] },
    });
    expect(
      warnings.some((w) => w.id === "empty-round-1-0" && w.dayOfWeek === 1),
    ).toBe(true);
  });

  it("warns on push-heavy skew with no pull or lower", () => {
    const warnings = analyzeWeekBlueprint({
      0: { dayKind: "workout", rounds: [{ groups: ["upper_push"] }] },
      1: { dayKind: "workout", rounds: [{ groups: ["upper_push"] }] },
      2: { dayKind: "workout", rounds: [{ groups: ["upper_push"] }] },
      6: { dayKind: "full_rest", rounds: [] },
    });
    expect(warnings.some((w) => w.id === "skew-emphasis")).toBe(true);
  });

  it("warns when many workout days have no core groups", () => {
    const warnings = analyzeWeekBlueprint({
      0: { dayKind: "workout", rounds: [{ groups: ["upper_push"] }] },
      1: { dayKind: "workout", rounds: [{ groups: ["upper_pull"] }] },
      2: { dayKind: "workout", rounds: [{ groups: ["lower"] }] },
      3: { dayKind: "workout", rounds: [{ groups: ["upper_push"] }] },
      6: { dayKind: "full_rest", rounds: [] },
    });
    expect(warnings.some((w) => w.id === "no-core")).toBe(true);
  });
});
