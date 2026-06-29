import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { materializeTrainingWeek } from "@/lib/planGenerator";
import {
  pickStretchEntries,
  resolveStretchesForDay,
  resolveStretchesForWeekSequential,
} from "@/lib/dayStretchPlan";
import {
  COOL_DOWN_CATALOG_POOLS,
  WARM_SESSION_CATALOG_POOLS,
  WARM_UP_CATALOG_POOLS,
} from "@/lib/stretchCatalogPools";
import {
  COOL_DOWN_STRETCHES_PER_DAY,
  DEFAULT_WARM_UP_STRETCH_COUNT,
} from "@/lib/stretchCounts";
import { buildStretchResolveContextFromInputs } from "@/lib/stretchResolveContext";
import type { DayPlan, StretchEntry } from "@/types";

function ctxFor(
  prefs: Record<string, "disliked"> = {},
  weekRotationKey = "2026-05-10",
  warmUpStretchCount = DEFAULT_WARM_UP_STRETCH_COUNT,
  coolDownStretchCount = COOL_DOWN_STRETCHES_PER_DAY,
) {
  return buildStretchResolveContextFromInputs({
    warmUpStretchCount,
    coolDownStretchCount,
    exercisePreferences: prefs,
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

  it("derives the configured cool-down count for the day", () => {
    const tuesday = buildCatalogWeek()[2]!;
    const { coolDown } = resolveStretchesForDay(tuesday, ctxFor());
    expect(coolDown.length).toBe(COOL_DOWN_STRETCHES_PER_DAY);
    const upperScIds = new Set(
      COOL_DOWN_CATALOG_POOLS.upper.map((e) => e.exerciseId),
    );
    const lowerScIds = new Set(
      COOL_DOWN_CATALOG_POOLS.lower.map((e) => e.exerciseId),
    );
    const coreScIds = new Set(
      COOL_DOWN_CATALOG_POOLS.core.map((e) => e.exerciseId),
    );
    for (const entry of coolDown) {
      expect(
        lowerScIds.has(entry.exerciseId) || coreScIds.has(entry.exerciseId),
      ).toBe(true);
      expect(upperScIds.has(entry.exerciseId)).toBe(false);
    }
  });

  it("omits upper warm-ups on lower day", () => {
    const tuesday = buildCatalogWeek()[2]!;
    const { warmUp } = resolveStretchesForDay(tuesday, ctxFor());
    const upperWarmIds = new Set(
      WARM_SESSION_CATALOG_POOLS.upper.map((e) => e.exerciseId),
    );
    for (const entry of warmUp) {
      expect(upperWarmIds.has(entry.exerciseId)).toBe(false);
    }
  });

  it("respects the configured warm-up count", () => {
    const monday = buildCatalogWeek()[1]!;
    const { warmUp } = resolveStretchesForDay(monday, ctxFor({}, "2026-05-10", 3));
    expect(warmUp.length).toBe(3);
  });

  it("still assigns cool-downs on the last day of a sequential week", () => {
    const week = materializeTrainingWeek(
      buildCatalogWeek(),
      {},
      [...DEFAULT_AVAILABLE_EQUIPMENT],
      "balanced",
      "standard",
      undefined,
      "cool-down-week",
    );
    const weekPlans = Array.from({ length: 7 }, (_, d) => week[d] ?? null);
    const ctx = ctxFor({}, "2026-05-18");
    const perDay = resolveStretchesForWeekSequential(weekPlans, ctx);
    const saturday = perDay[6];
    expect(saturday?.coolDown.length).toBe(COOL_DOWN_STRETCHES_PER_DAY);
  });

  it("uses per-day overrides when set", () => {
    const monday = buildCatalogWeek()[1]!;
    const override: StretchEntry[] = [{ exerciseId: "SW-8", targetReps: "5" }];
    const plan: DayPlan = { ...monday, warmUp: override };
    const { warmUp } = resolveStretchesForDay(plan, ctxFor());
    expect(warmUp.map((e) => e.exerciseId)).toEqual(["SW-8"]);
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

  it("limits stretch repeats across the week when resolved sequentially", () => {
    const week = materializeTrainingWeek(
      buildCatalogWeek(),
      {},
      [...DEFAULT_AVAILABLE_EQUIPMENT],
      "balanced",
      "standard",
      undefined,
      "audit-variety-week",
    );
    const weekPlans = Array.from({ length: 7 }, (_, d) => week[d] ?? null);
    const ctx = ctxFor({}, "2026-05-18");
    const perDay = resolveStretchesForWeekSequential(weekPlans, ctx);
    const counts = new Map<string, number>();
    for (const day of perDay) {
      if (!day) continue;
      for (const e of day.warmUp) {
        counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + 1);
      }
    }
    const maxRepeat = Math.max(0, ...counts.values());
    expect(maxRepeat).toBeLessThanOrEqual(5);
  });

  it("rotates catalog picks across weeks for the same day", () => {
    const monday = buildCatalogWeek()[1]!;
    const weekA = resolveStretchesForDay(
      monday,
      ctxFor({}, "2026-05-10"),
    ).warmUp.map((e) => e.exerciseId);
    const weekB = resolveStretchesForDay(
      monday,
      ctxFor({}, "2026-05-17"),
    ).warmUp.map((e) => e.exerciseId);
    expect(weekA.sort()).not.toEqual(weekB.sort());
  });

  it("treats empty coolDown override as derived (not zero stretches)", () => {
    const monday = buildCatalogWeek()[1]!;
    const derivedOnly = resolveStretchesForDay(monday, ctxFor());
    const withEmptyCool: DayPlan = { ...monday, coolDown: [] };
    const { coolDown } = resolveStretchesForDay(withEmptyCool, ctxFor());
    expect(coolDown.length).toBeGreaterThan(0);
    expect(coolDown.length).toBe(derivedOnly.coolDown.length);
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

  it("skips warm catalog picks already prescribed in strength or cardio slots", () => {
    const monday = buildCatalogWeek()[1]!;
    const plan: DayPlan = {
      ...monday,
      cardioActivities: [
        {
          kind: "jog",
          exerciseId: "PC-5",
          defaultPrescription: "20 each leg",
        },
      ],
      strengthFocus: [...monday.strengthFocus, "PC"],
    };
    const { warmUp } = resolveStretchesForDay(plan, ctxFor());
    expect(warmUp.map((e) => e.exerciseId)).not.toContain("PC-5");
  });

  it("materializes stretches onto generated week days", () => {
    const week = materializeTrainingWeek(
      buildCatalogWeek(),
      {},
      [...DEFAULT_AVAILABLE_EQUIPMENT],
      "balanced",
      "standard",
    );
    const monday = week[1];
    expect(monday?.warmUp?.length).toBe(DEFAULT_WARM_UP_STRETCH_COUNT);
    expect(monday?.coolDown?.length).toBe(COOL_DOWN_STRETCHES_PER_DAY);
  });
});
