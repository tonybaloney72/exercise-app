import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import {
  applyProgramProfileToDayPlan,
  ROUND_DENSITY_TARGETS,
} from "@/lib/programProfile";
import type { DayPlan, ExerciseCategory } from "@/types";
import type { ExercisePreferenceMap } from "@/lib/repos";

const EQUIP = [...DEFAULT_AVAILABLE_EQUIPMENT];
const EMPTY_PREFS: ExercisePreferenceMap = {};

function roundSlotCount(plan: DayPlan, roundIndex = 0): number {
  return plan.rounds[roundIndex]?.exercises.length ?? 0;
}

function roundCategories(plan: DayPlan, roundIndex = 0): ExerciseCategory[] {
  return plan.rounds[roundIndex]?.exercises.map((ex) => ex.category) ?? [];
}

describe("applyProgramProfileToDayPlan", () => {
  const monday = buildCatalogWeek()[1]!;

  it("trims each round to the compact density target", () => {
    const shaped = applyProgramProfileToDayPlan(
      monday,
      "balanced",
      "compact",
      EQUIP,
      EMPTY_PREFS,
    );
    expect(roundSlotCount(shaped)).toBe(ROUND_DENSITY_TARGETS.compact);
  });

  it("keeps fewer core slots than core_emphasis at compact density", () => {
    const minimal = applyProgramProfileToDayPlan(
      monday,
      "minimal_core",
      "compact",
      EQUIP,
      EMPTY_PREFS,
    );
    const coreHeavy = applyProgramProfileToDayPlan(
      monday,
      "core_emphasis",
      "compact",
      EQUIP,
      EMPTY_PREFS,
    );
    const coreCats = new Set<ExerciseCategory>(["CF", "CL", "CR", "CS"]);
    const countCore = (plan: DayPlan) =>
      roundCategories(plan).filter((c) => coreCats.has(c)).length;

    expect(countCore(minimal)).toBeLessThan(countCore(coreHeavy));
    expect(roundCategories(minimal).some((c) => c === "UP")).toBe(true);
  });

  it("adds slots up to full density when the template round is shorter", () => {
    const sunday = buildCatalogWeek()[0]!;
    const full = applyProgramProfileToDayPlan(
      sunday,
      "balanced",
      "full",
      EQUIP,
      EMPTY_PREFS,
    );
    expect(roundSlotCount(full)).toBe(ROUND_DENSITY_TARGETS.full);
  });

  it("prefers conditioning slots when focus is conditioning at compact density", () => {
    const conditioning = applyProgramProfileToDayPlan(
      monday,
      "conditioning",
      "compact",
      EQUIP,
      EMPTY_PREFS,
    );
    expect(roundCategories(conditioning)).toContain("PC");
  });

  it("re-picks exercises when program focus changes at standard density", () => {
    const upper = applyProgramProfileToDayPlan(
      monday,
      "upper_body",
      "standard",
      EQUIP,
      EMPTY_PREFS,
    );
    const lower = applyProgramProfileToDayPlan(
      monday,
      "lower_body",
      "standard",
      EQUIP,
      EMPTY_PREFS,
    );
    const idsUpper = upper.rounds.flatMap((r) => r.exercises.map((e) => e.exerciseId));
    const idsLower = lower.rounds.flatMap((r) => r.exercises.map((e) => e.exerciseId));
    expect(idsUpper.sort()).not.toEqual(idsLower.sort());
  });
});
