import { describe, expect, it } from "vitest";
import {
  buildCatalogWeek,
  isThemesOnlyCatalogPlan,
} from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { balancedRoundBudget } from "@/lib/balancedRoundBudget";
import {
  applyProgramProfileToDayPlan,
  ROUND_DENSITY_TARGETS,
} from "@/lib/programProfile";
import { buildVarietySeed } from "@/lib/planVariety";
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
  const mondaySeed = buildCatalogWeek()[1]!;

  it("fills rounds from themes-only catalog seed", () => {
    expect(isThemesOnlyCatalogPlan(mondaySeed)).toBe(true);
    const shaped = applyProgramProfileToDayPlan(
      mondaySeed,
      "balanced",
      "standard",
      EQUIP,
      EMPTY_PREFS,
    );
    expect(shaped.rounds[0]!.exercises.length).toBeGreaterThan(0);
  });

  it("trims each round to the compact density target", () => {
    const shaped = applyProgramProfileToDayPlan(
      mondaySeed,
      "balanced",
      "compact",
      EQUIP,
      EMPTY_PREFS,
    );
    expect(roundSlotCount(shaped)).toBe(ROUND_DENSITY_TARGETS.compact);
  });

  it("keeps fewer core slots than core_emphasis at compact density", () => {
    const minimal = applyProgramProfileToDayPlan(
      mondaySeed,
      "minimal_core",
      "compact",
      EQUIP,
      EMPTY_PREFS,
    );
    const coreHeavy = applyProgramProfileToDayPlan(
      mondaySeed,
      "core_emphasis",
      "compact",
      EQUIP,
      EMPTY_PREFS,
    );
    const coreCats = new Set<ExerciseCategory>(["CF", "CL", "CR", "CS"]);
    const countCore = (plan: DayPlan) =>
      roundCategories(plan).filter((c) => coreCats.has(c)).length;

    expect(countCore(minimal)).toBeLessThan(countCore(coreHeavy));
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
      mondaySeed,
      "conditioning",
      "compact",
      EQUIP,
      EMPTY_PREFS,
    );
    expect(roundCategories(conditioning)).toContain("PC");
  });

  it("includes conditioning in rounds when the day has a jog", () => {
    const shaped = applyProgramProfileToDayPlan(
      mondaySeed,
      "balanced",
      "standard",
      EQUIP,
      EMPTY_PREFS,
    );
    const categories = shaped.rounds.flatMap((r) =>
      r.exercises.map((e) => e.category),
    );
    expect(categories).toContain("PC");
  });

  it("upper_body on a lower-themed day mixes categories instead of filling with UP only", () => {
    const tuesday = buildCatalogWeek()[2]!;
    const shaped = applyProgramProfileToDayPlan(
      tuesday,
      "upper_body",
      "standard",
      EQUIP,
      EMPTY_PREFS,
    );
    const round0 = shaped.rounds[0]!.exercises.map((e) => e.category);
    const unique = new Set(round0);
    expect(unique.size).toBeGreaterThan(1);
    expect(unique.has("UP")).toBe(true);
    expect(round0.every((c) => c === "UP")).toBe(false);
  });

  it("re-picks exercises when program focus changes at standard density", () => {
    const upper = applyProgramProfileToDayPlan(
      mondaySeed,
      "upper_body",
      "standard",
      EQUIP,
      EMPTY_PREFS,
    );
    const lower = applyProgramProfileToDayPlan(
      mondaySeed,
      "lower_body",
      "standard",
      EQUIP,
      EMPTY_PREFS,
    );
    const idsUpper = upper.rounds.flatMap((r) => r.exercises.map((e) => e.exerciseId));
    const idsLower = lower.rounds.flatMap((r) => r.exercises.map((e) => e.exerciseId));
    expect(idsUpper.sort()).not.toEqual(idsLower.sort());
  });

  it("balanced uses explicit round budgets at standard density", () => {
    const shaped = applyProgramProfileToDayPlan(
      mondaySeed,
      "balanced",
      "standard",
      EQUIP,
      EMPTY_PREFS,
    );
    expect(
      shaped.rounds[0]!.exercises.map((e) => e.category),
    ).toEqual(balancedRoundBudget(mondaySeed, 1, ROUND_DENSITY_TARGETS.standard));
  });

  it("uses different exercises across rounds at standard density", () => {
    const shaped = applyProgramProfileToDayPlan(
      mondaySeed,
      "core_emphasis",
      "standard",
      EQUIP,
      EMPTY_PREFS,
    );
    expect(shaped.rounds.length).toBeGreaterThanOrEqual(2);
    const r0 = shaped.rounds[0]!.exercises.map((e) => e.exerciseId);
    const r1 = shaped.rounds[1]!.exercises.map((e) => e.exerciseId);
    expect(r0).not.toEqual(r1);
  });

  it("applies per-exercise timer settings to targetReps", () => {
    const shaped = applyProgramProfileToDayPlan(
      mondaySeed,
      "balanced",
      "standard",
      EQUIP,
      EMPTY_PREFS,
      {
        "CR-4": {
          defaultSetMode: "timer",
          defaultTimerSeconds: 45,
        },
      },
    );
    const russian = shaped.rounds
      .flatMap((r) => r.exercises)
      .find((e) => e.exerciseId === "CR-4");
    if (russian) {
      expect(russian.targetReps).toBe("45 sec");
    }
  });

  it("variety seed changes balanced exercise ids for the same day theme", () => {
    const seedA = buildVarietySeed("2026-05-10", "test");
    const seedB = buildVarietySeed("2026-05-17", "test");
    const a = applyProgramProfileToDayPlan(
      mondaySeed,
      "balanced",
      "standard",
      EQUIP,
      EMPTY_PREFS,
      undefined,
      seedA,
    );
    const b = applyProgramProfileToDayPlan(
      mondaySeed,
      "balanced",
      "standard",
      EQUIP,
      EMPTY_PREFS,
      undefined,
      seedB,
    );
    const idsA = a.rounds.flatMap((r) => r.exercises.map((e) => e.exerciseId));
    const idsB = b.rounds.flatMap((r) => r.exercises.map((e) => e.exerciseId));
    expect(idsA.sort()).not.toEqual(idsB.sort());
  });
});
