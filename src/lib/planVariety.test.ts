import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { materializeTrainingWeek } from "@/lib/planGenerator";
import { buildVarietySeed } from "@/lib/planVariety";
import type { ExercisePreferenceMap } from "@/lib/repos";

const EQUIP = [...DEFAULT_AVAILABLE_EQUIPMENT];
const EMPTY_PREFS: ExercisePreferenceMap = {};

describe("planVariety", () => {
  it("different week keys yield different Monday exercise ids at balanced standard", () => {
    const catalog = buildCatalogWeek();
    const weekA = materializeTrainingWeek(
      catalog,
      EMPTY_PREFS,
      EQUIP,
      "balanced",
      "standard",
      undefined,
      buildVarietySeed("2026-05-10", "user-a"),
    );
    const weekB = materializeTrainingWeek(
      catalog,
      EMPTY_PREFS,
      EQUIP,
      "balanced",
      "standard",
      undefined,
      buildVarietySeed("2026-05-17", "user-a"),
    );
    const idsA = weekA[1]!.rounds.flatMap((r) => r.exercises.map((e) => e.exerciseId));
    const idsB = weekB[1]!.rounds.flatMap((r) => r.exercises.map((e) => e.exerciseId));
    expect(idsA.sort()).not.toEqual(idsB.sort());
  });

  it("same variety seed yields identical Monday picks", () => {
    const catalog = buildCatalogWeek();
    const seed = buildVarietySeed("2026-05-10", "user-a");
    const once = materializeTrainingWeek(
      catalog,
      EMPTY_PREFS,
      EQUIP,
      "balanced",
      "standard",
      undefined,
      seed,
    );
    const twice = materializeTrainingWeek(
      catalog,
      EMPTY_PREFS,
      EQUIP,
      "balanced",
      "standard",
      undefined,
      seed,
    );
    const ids1 = once[1]!.rounds.flatMap((r) => r.exercises.map((e) => e.exerciseId));
    const ids2 = twice[1]!.rounds.flatMap((r) => r.exercises.map((e) => e.exerciseId));
    expect(ids1).toEqual(ids2);
  });
});
