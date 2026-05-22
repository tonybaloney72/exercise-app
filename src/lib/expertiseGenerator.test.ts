import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { exerciseMap } from "@/data/exercises";
import { getReplacementCandidates } from "@/lib/exerciseCandidates";
import { applyProgramProfileToDayPlan } from "@/lib/programProfile";
import { resolveExpertiseFilter } from "@/lib/expertiseLevels";
import type { ExercisePreferenceMap } from "@/lib/repos";
import { DEFAULT_SETTINGS } from "@/lib/repos/types";
import type { ExpertiseByGroup, UserSettings } from "@/types";

const EQUIP = [...DEFAULT_AVAILABLE_EQUIPMENT];
const EMPTY_PREFS: ExercisePreferenceMap = {};

function userSettingsWithPushCap(level: ExpertiseByGroup["upper_push"]): UserSettings {
  return {
    ...DEFAULT_SETTINGS,
    expertiseByGroup: {
      ...DEFAULT_SETTINGS.expertiseByGroup,
      upper_push: level,
    },
  };
}

describe("generator expertise cap", () => {
  const monday = buildCatalogWeek()[1]!;

  it("does not prescribe expert push moves when push cap is novice", () => {
    const shaped = applyProgramProfileToDayPlan(
      monday,
      "balanced",
      "full",
      EQUIP,
      EMPTY_PREFS,
      undefined,
      undefined,
      undefined,
      userSettingsWithPushCap("novice"),
    );
    const ids = shaped.rounds.flatMap((r) =>
      r.exercises.map((e) => e.exerciseId),
    );
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const meta = exerciseMap[id];
      const level = meta?.expertiseLevel ?? "intermediate";
      if (meta?.category === "UP") {
        expect(["beginner", "novice"]).toContain(level);
      }
    }
    expect(ids).not.toContain("HC-184");
  });

  it("excludes expert push moves at default intermediate cap", () => {
    const filter = resolveExpertiseFilter({
      expertiseByGroup: DEFAULT_SETTINGS.expertiseByGroup,
    });
    const candidates = getReplacementCandidates({
      category: "UP",
      excludeExerciseIds: new Set(),
      availableEquipment: EQUIP,
      expertiseFilter: filter,
    });
    expect(candidates.some((ex) => ex.id === "HC-184")).toBe(false);
  });

  it("includes expert push moves when push cap is expert", () => {
    const filter = resolveExpertiseFilter({
      expertiseByGroup: userSettingsWithPushCap("expert").expertiseByGroup,
    });
    const candidates = getReplacementCandidates({
      category: "UP",
      excludeExerciseIds: new Set(),
      availableEquipment: EQUIP,
      expertiseFilter: filter,
    });
    expect(candidates.some((ex) => ex.id === "HC-184")).toBe(true);
  });
});
