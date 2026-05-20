import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { pickStretchEntries, resolveStretchesForDay } from "@/lib/dayStretchPlan";
import {
  COOL_DOWN_CATALOG_POOLS,
  WARM_SESSION_CATALOG_POOLS,
  WARM_UP_CATALOG_POOLS,
} from "@/lib/stretchCatalogPools";
import { stretchCoolDownQuota } from "@/lib/trainingPriorityStretches";
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

describe("pickStretchEntries", () => {
  it("does not simply take the first N stretches in catalog id order", () => {
    const pool = COOL_DOWN_CATALOG_POOLS.lower;
    const picks = pickStretchEntries(pool, 6, "audit-week-1-lower-cool", new Set());
    const firstSixByCatalogId = [...pool]
      .map((e) => e.exerciseId)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 6);
    expect(picks.map((e) => e.exerciseId)).not.toEqual(firstSixByCatalogId);
  });

  it("is deterministic for the same seed", () => {
    const pool = WARM_UP_CATALOG_POOLS.upper;
    const idsA = pickStretchEntries(pool, 4, "d1-warm-upper", new Set()).map(
      (e) => e.exerciseId,
    );
    const idsB = pickStretchEntries(pool, 4, "d1-warm-upper", new Set()).map(
      (e) => e.exerciseId,
    );
    expect(idsA).toEqual(idsB);
  });

  it("varies picks when the seed changes", () => {
    const pool = WARM_UP_CATALOG_POOLS.lower;
    const idsA = pickStretchEntries(pool, 5, "seed-a", new Set()).map(
      (e) => e.exerciseId,
    );
    const idsB = pickStretchEntries(pool, 5, "seed-b", new Set()).map(
      (e) => e.exerciseId,
    );
    expect(idsA.sort()).not.toEqual(idsB.sort());
  });
});

describe("resolveStretchesForDay", () => {
  it("derives upper-body warm-up pool for an upper push day", () => {
    const monday = buildCatalogWeek()[1]!;
    const { warmUp } = resolveStretchesForDay(monday, ctxFor());
    const ids = warmUp.map((e) => e.exerciseId);
    const upperIds = new Set(
      WARM_SESSION_CATALOG_POOLS.upper.map((e) => e.exerciseId),
    );
    expect(ids.some((id) => upperIds.has(id))).toBe(true);
  });

  it("can pick cool-down catalog stretches in warm-up", () => {
    const coreSc = new Set(
      COOL_DOWN_CATALOG_POOLS.core.map((e) => e.exerciseId),
    );
    const week = buildCatalogWeek();
    const anyDayUsesScInWarm = Object.values(week).some((day) => {
      if (!day) return false;
      const { warmUp } = resolveStretchesForDay(day, ctxFor());
      return warmUp.some((e) => coreSc.has(e.exerciseId));
    });
    expect(anyDayUsesScInWarm).toBe(true);
  });

  it("does not repeat warm-up stretch ids in derived cool-down", () => {
    const monday = buildCatalogWeek()[1]!;
    const { warmUp, coolDown } = resolveStretchesForDay(monday, ctxFor());
    const warmIds = new Set(warmUp.map((e) => e.exerciseId));
    for (const entry of coolDown) {
      expect(warmIds.has(entry.exerciseId)).toBe(false);
    }
  });

  it("targets about five catalog cool-down picks on a balanced training day", () => {
    const monday = buildCatalogWeek()[1]!;
    const poolTotal =
      stretchCoolDownQuota("upper", "balanced") +
      stretchCoolDownQuota("lower", "balanced") +
      stretchCoolDownQuota("core", "balanced");
    expect(poolTotal).toBe(5);
    const { coolDown } = resolveStretchesForDay(monday, ctxFor());
    expect(coolDown.length).toBeLessThanOrEqual(poolTotal);
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
