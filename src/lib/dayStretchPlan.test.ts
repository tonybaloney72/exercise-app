import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { resolveStretchesForDay } from "@/lib/dayStretchPlan";
import { WARM_UP_CATALOG_POOLS } from "@/lib/stretchCatalogPools";
import { buildStretchResolveContextFromInputs } from "@/lib/stretchResolveContext";
import type { DayPlan, StretchEntry } from "@/types";

const EMPTY_DEFAULTS: StretchEntry[] = [];

function ctxFor(
  prefs: Record<string, "disliked"> = {},
  trainingPriorityPreset:
    | "balanced"
    | "upper_body"
    | "conditioning"
    | "lower_body" = "balanced",
  weekRotationKey = "2026-05-10",
) {
  return buildStretchResolveContextFromInputs({
    defaultWarmUp: EMPTY_DEFAULTS,
    defaultCoolDown: EMPTY_DEFAULTS,
    authMode: "authenticated",
    exercisePreferences: prefs,
    trainingPriorityPreset,
    weekRotationKey,
  });
}

describe("resolveStretchesForDay", () => {
  it("derives upper-body warm-up pool for an upper push day", () => {
    const monday = buildCatalogWeek()[1]!;
    const { warmUp } = resolveStretchesForDay(monday, ctxFor());
    const ids = warmUp.map((e) => e.exerciseId);
    const upperIds = new Set(WARM_UP_CATALOG_POOLS.upper.map((e) => e.exerciseId));
    expect(ids.some((id) => upperIds.has(id))).toBe(true);
  });

  it("uses per-day overrides when set", () => {
    const monday = buildCatalogWeek()[1]!;
    const override: StretchEntry[] = [{ exerciseId: "SW-8", targetReps: "5" }];
    const plan: DayPlan = { ...monday, warmUp: override };
    const { warmUp } = resolveStretchesForDay(plan, ctxFor());
    expect(warmUp.map((e) => e.exerciseId)).toEqual(["SW-8"]);
  });

  it("omits leg-dominant warm-ups on upper day when program focus is upper body", () => {
    const monday = buildCatalogWeek()[1]!;
    const { warmUp } = resolveStretchesForDay(monday, ctxFor({}, "upper_body"));
    const ids = warmUp.map((e) => e.exerciseId);
    expect(ids).not.toContain("SW-11");
    expect(ids).not.toContain("SW-12");
    expect(ids).not.toContain("SW-14");
  });

  it("adds conditioning warm-ups when training priority is conditioning", () => {
    const monday = buildCatalogWeek()[1]!;
    const balanced = resolveStretchesForDay(monday, ctxFor({}, "balanced")).warmUp.map(
      (e) => e.exerciseId,
    );
    const conditioning = resolveStretchesForDay(
      monday,
      ctxFor({}, "conditioning"),
    ).warmUp.map((e) => e.exerciseId);
    const conditioningIds = new Set(
      WARM_UP_CATALOG_POOLS.conditioning.map((e) => e.exerciseId),
    );
    expect(conditioning.some((id) => conditioningIds.has(id))).toBe(true);
    expect(conditioning).not.toEqual(balanced);
  });

  it("varies warm-up picks by day of week", () => {
    const week = buildCatalogWeek();
    const monday = resolveStretchesForDay(week[1]!, ctxFor()).warmUp.map(
      (e) => e.exerciseId,
    );
    const tuesday = resolveStretchesForDay(week[2]!, ctxFor()).warmUp.map(
      (e) => e.exerciseId,
    );
    expect(monday.sort()).not.toEqual(tuesday.sort());
  });

  it("rotates catalog picks across weeks for the same day", () => {
    const monday = buildCatalogWeek()[1]!;
    const weekA = resolveStretchesForDay(
      monday,
      ctxFor({}, "balanced", "2026-05-10"),
    ).warmUp.map((e) => e.exerciseId);
    const weekB = resolveStretchesForDay(
      monday,
      ctxFor({}, "balanced", "2026-05-17"),
    ).warmUp.map((e) => e.exerciseId);
    expect(weekA.sort()).not.toEqual(weekB.sort());
  });

  it("can return more than six warm-ups when multiple themed pools apply", () => {
    const tuesday = buildCatalogWeek()[2]!;
    const { warmUp } = resolveStretchesForDay(
      tuesday,
      ctxFor({}, "lower_body"),
    );
    expect(warmUp.length).toBeGreaterThan(6);
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
