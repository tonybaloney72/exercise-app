import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import {
  computePrefsFingerprint,
  isUserCustomizedWeekSource,
  materializeTrainingWeek,
  TRAINING_WEEK_SOURCE_CUSTOM_V1,
  TRAINING_WEEK_SOURCE_GENERATED_V1,
  weekContainsDislikedExercise,
  weekDaysComplete,
  weekNeedsMaterialization,
} from "@/lib/planGenerator";
import type { ExercisePreferenceMap, TrainingWeekDays } from "@/lib/repos";
import { weekExerciseIdsByDay } from "@/test/weekTestUtils";

const EQUIP = [...DEFAULT_AVAILABLE_EQUIPMENT];
const EMPTY_PREFS: ExercisePreferenceMap = {};

function materializeBalanced() {
  return materializeTrainingWeek(
    buildCatalogWeek(),
    EMPTY_PREFS,
    EQUIP,
    "balanced",
    "standard",
  );
}

describe("computePrefsFingerprint", () => {
  it("sorts dislikes and favorites for a stable key", () => {
    const prefsA: ExercisePreferenceMap = {
      "UP-2": "disliked",
      "UP-1": "disliked",
      "LB-1": "favorite",
      "LB-2": "favorite",
    };
    const prefsB: ExercisePreferenceMap = {
      "UP-1": "disliked",
      "UP-2": "disliked",
      "LB-2": "favorite",
      "LB-1": "favorite",
    };
    expect(computePrefsFingerprint(prefsA, EQUIP)).toBe(
      computePrefsFingerprint(prefsB, EQUIP),
    );
    expect(computePrefsFingerprint(prefsA, EQUIP)).toContain("d:UP-1,UP-2");
    expect(computePrefsFingerprint(prefsA, EQUIP)).toContain("fv:LB-1,LB-2");
  });

  it("includes PPL template segment in preset mode", () => {
    const fp = computePrefsFingerprint(EMPTY_PREFS, EQUIP, "balanced", "standard");
    expect(fp).toContain("ppl:ppl-2026-05-v4:balanced");
  });

  it("changes when program focus, density, equipment, or stretches change", () => {
    const base = computePrefsFingerprint(EMPTY_PREFS, EQUIP);
    expect(computePrefsFingerprint(EMPTY_PREFS, EQUIP, "upper_body")).not.toBe(base);
    expect(computePrefsFingerprint(EMPTY_PREFS, EQUIP, "balanced", "compact")).not.toBe(
      base,
    );
    expect(computePrefsFingerprint(EMPTY_PREFS, ["bodyweight", "rings"])).not.toBe(
      base,
    );
    const warmCount = 6;
    expect(
      computePrefsFingerprint(EMPTY_PREFS, EQUIP, "balanced", "standard", warmCount, 5),
    ).not.toBe(base);
  });
});

describe("isUserCustomizedWeekSource", () => {
  it("recognizes custom week source only", () => {
    expect(isUserCustomizedWeekSource(TRAINING_WEEK_SOURCE_CUSTOM_V1)).toBe(true);
    expect(isUserCustomizedWeekSource(TRAINING_WEEK_SOURCE_GENERATED_V1)).toBe(false);
    expect(isUserCustomizedWeekSource(null)).toBe(false);
  });
});

describe("materializeTrainingWeek", () => {
  it("returns a complete week deterministically", () => {
    const a = materializeBalanced();
    const b = materializeBalanced();
    expect(weekDaysComplete(a)).toBe(true);
    expect(weekExerciseIdsByDay(a)).toEqual(weekExerciseIdsByDay(b));
  });

  it("trims exercises per round when round density is compact", () => {
    const standard = materializeTrainingWeek(
      buildCatalogWeek(),
      EMPTY_PREFS,
      EQUIP,
      "balanced",
      "standard",
    );
    const compact = materializeTrainingWeek(
      buildCatalogWeek(),
      EMPTY_PREFS,
      EQUIP,
      "balanced",
      "compact",
    );
    const mondaySlots = (week: TrainingWeekDays) =>
      week[1]!.rounds.reduce((n, round) => n + round.exercises.length, 0);
    expect(mondaySlots(compact)).toBeLessThan(mondaySlots(standard));
  });

  it("materializes different exercises for different program focus", () => {
    const upper = materializeTrainingWeek(
      buildCatalogWeek(),
      EMPTY_PREFS,
      EQUIP,
      "upper_body",
      "standard",
    );
    const lower = materializeTrainingWeek(
      buildCatalogWeek(),
      EMPTY_PREFS,
      EQUIP,
      "lower_body",
      "standard",
    );
    expect(weekExerciseIdsByDay(upper)[1].sort()).not.toEqual(
      weekExerciseIdsByDay(lower)[1].sort(),
    );
  });

  it("removes disliked exercises from the materialized week", () => {
    const prefs: ExercisePreferenceMap = { "UP-1": "disliked" };
    const week = materializeTrainingWeek(
      buildCatalogWeek(),
      prefs,
      EQUIP,
      "balanced",
      "standard",
    );
    expect(weekContainsDislikedExercise(week, new Set(["UP-1"]))).toBe(false);
    const mondayIds = weekExerciseIdsByDay(week)[1];
    expect(mondayIds).not.toContain("UP-1");
    const monday = week[1]!;
    expect(
      monday.rounds.some((round) =>
        round.exercises.some((slot) => slot.category === "UP"),
      ),
    ).toBe(true);
  });
});

describe("weekNeedsMaterialization", () => {
  const fingerprint = computePrefsFingerprint(EMPTY_PREFS, EQUIP);
  const stored = materializeBalanced();

  it("requires regen for custom week when fingerprint mismatches", () => {
    expect(
      weekNeedsMaterialization(
        stored,
        "stale",
        TRAINING_WEEK_SOURCE_CUSTOM_V1,
        fingerprint,
        new Set(),
      ),
    ).toBe(true);
  });

  it("requires regen when week is incomplete, fingerprint mismatches, or dislikes remain", () => {
    const partial: TrainingWeekDays = { 0: stored[0] };
    expect(
      weekNeedsMaterialization(partial, fingerprint, null, fingerprint, new Set()),
    ).toBe(true);

    expect(
      weekNeedsMaterialization(stored, "stale", null, fingerprint, new Set()),
    ).toBe(true);

    const storedWithDislikedSlot = structuredClone(stored);
    storedWithDislikedSlot[1]!.rounds[0]!.exercises[0] = {
      exerciseId: "UP-1",
      category: "UP",
      targetReps: "10",
    };
    expect(
      weekNeedsMaterialization(
        storedWithDislikedSlot,
        fingerprint,
        null,
        fingerprint,
        new Set(["UP-1"]),
      ),
    ).toBe(true);
  });

  it("does not regen when stored week matches fingerprint and has no dislikes", () => {
    expect(
      weekNeedsMaterialization(stored, fingerprint, null, fingerprint, new Set()),
    ).toBe(false);
  });
});
