import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { resolveStretchesForDay } from "@/lib/dayStretchPlan";
import { buildStretchResolveContextFromInputs } from "@/lib/stretchResolveContext";
import type { DayPlan, StretchEntry } from "@/types";

const EMPTY_DEFAULTS: StretchEntry[] = [];

function ctxFor(prefs: Record<string, "disliked"> = {}) {
  return buildStretchResolveContextFromInputs({
    defaultWarmUp: EMPTY_DEFAULTS,
    defaultCoolDown: EMPTY_DEFAULTS,
    authMode: "authenticated",
    exercisePreferences: prefs,
  });
}

describe("resolveStretchesForDay", () => {
  it("derives upper-body warm-up pool for an upper push day", () => {
    const monday = buildCatalogWeek()[1]!;
    const { warmUp } = resolveStretchesForDay(monday, ctxFor());
    const ids = warmUp.map((e) => e.exerciseId);
    expect(ids).toContain("SW-3");
    expect(ids).toContain("SW-31");
  });

  it("uses per-day overrides when set", () => {
    const monday = buildCatalogWeek()[1]!;
    const override: StretchEntry[] = [{ exerciseId: "SW-8", targetReps: "5" }];
    const plan: DayPlan = { ...monday, warmUp: override };
    const { warmUp } = resolveStretchesForDay(plan, ctxFor());
    expect(warmUp.map((e) => e.exerciseId)).toEqual(["SW-8"]);
  });

  it("filters disliked stretches from overrides", () => {
    const monday = buildCatalogWeek()[1]!;
    const plan: DayPlan = {
      ...monday,
      warmUp: [
        { exerciseId: "SW-8", targetReps: "5" },
        { exerciseId: "SW-3", targetReps: "10" },
      ],
    };
    const { warmUp } = resolveStretchesForDay(
      plan,
      ctxFor({ "SW-8": "disliked" }),
    );
    expect(warmUp.map((e) => e.exerciseId)).toEqual(["SW-3"]);
  });
});
