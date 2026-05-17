import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { resolveStretchesForDay } from "@/lib/dayStretchPlan";
import {
  GUEST_FALLBACK_COOL_DOWN,
  GUEST_FALLBACK_WARM_UP,
} from "@/lib/stretchDefaults";
import { buildStretchResolveContextFromInputs } from "@/lib/stretchResolveContext";
import type { StretchEntry } from "@/types";

const EMPTY: StretchEntry[] = [];
const USER_WARM: StretchEntry[] = [{ exerciseId: "SW-8", targetReps: "8 each side" }];

describe("buildStretchResolveContextFromInputs", () => {
  it("uses empty defaults for authenticated users with no stored stretches", () => {
    const ctx = buildStretchResolveContextFromInputs({
      defaultWarmUp: EMPTY,
      defaultCoolDown: EMPTY,
      authMode: "authenticated",
      exercisePreferences: {},
    });
    expect(ctx.defaultWarmUp).toEqual([]);
    expect(ctx.defaultCoolDown).toEqual([]);
  });

  it("falls back to catalog universal pools for guests when lists are empty", () => {
    const ctx = buildStretchResolveContextFromInputs({
      defaultWarmUp: EMPTY,
      defaultCoolDown: EMPTY,
      authMode: "guest",
      exercisePreferences: {},
    });
    expect(ctx.defaultWarmUp.map((e) => e.exerciseId)).toEqual(
      GUEST_FALLBACK_WARM_UP.map((e) => e.exerciseId),
    );
    expect(ctx.defaultCoolDown.map((e) => e.exerciseId)).toEqual(
      GUEST_FALLBACK_COOL_DOWN.map((e) => e.exerciseId),
    );
  });

  it("keeps signed-in user defaults and does not substitute guest catalog", () => {
    const ctx = buildStretchResolveContextFromInputs({
      defaultWarmUp: USER_WARM,
      defaultCoolDown: EMPTY,
      authMode: "authenticated",
      exercisePreferences: {},
    });
    expect(ctx.defaultWarmUp).toEqual(USER_WARM);
  });

  it("excludes disliked stretches from effective defaults", () => {
    const ctx = buildStretchResolveContextFromInputs({
      defaultWarmUp: USER_WARM,
      defaultCoolDown: EMPTY,
      authMode: "authenticated",
      exercisePreferences: { "SW-8": "disliked" },
    });
    expect(ctx.defaultWarmUp).toEqual([]);
    expect(ctx.dislikedExerciseIds.has("SW-8")).toBe(true);
  });

  it("resolves day stretches differently for guest vs authenticated with empty settings", () => {
    const monday = buildCatalogWeek()[1]!;
    const guestCtx = buildStretchResolveContextFromInputs({
      defaultWarmUp: EMPTY,
      defaultCoolDown: EMPTY,
      authMode: "guest",
      exercisePreferences: {},
    });
    const authCtx = buildStretchResolveContextFromInputs({
      defaultWarmUp: EMPTY,
      defaultCoolDown: EMPTY,
      authMode: "authenticated",
      exercisePreferences: {},
    });
    const guestWarm = resolveStretchesForDay(monday, guestCtx).warmUp.map(
      (e) => e.exerciseId,
    );
    const authWarm = resolveStretchesForDay(monday, authCtx).warmUp.map(
      (e) => e.exerciseId,
    );
    expect(guestWarm.length).toBeGreaterThan(0);
    expect(authWarm.length).toBeGreaterThan(0);
    expect(guestWarm).not.toEqual(authWarm);
  });
});
