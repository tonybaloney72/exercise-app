import { describe, expect, it } from "vitest";
import { buildWeekAuditReport } from "@/lib/generateWeekAudit";
import { isEnduranceBlockExerciseId } from "@/lib/enduranceBlockExercises";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { materializeTrainingWeek } from "@/lib/planGenerator";
import type { ExercisePreferenceMap } from "@/lib/repos";

const EMPTY_PREFS: ExercisePreferenceMap = {};

describe("buildWeekAuditReport", () => {
  it("never places END-* ids in round slots", () => {
    const week = materializeTrainingWeek(
      buildCatalogWeek(),
      EMPTY_PREFS,
      [...DEFAULT_AVAILABLE_EQUIPMENT],
      "balanced",
      "standard",
      undefined,
      "audit-seed",
    );
    for (let d = 0; d < 7; d++) {
      const plan = week[d];
      if (!plan) continue;
      for (const round of plan.rounds) {
        for (const ex of round.exercises) {
          expect(isEnduranceBlockExerciseId(ex.exerciseId)).toBe(false);
        }
      }
    }
  });

  it("lists cross-week stretch repeats", () => {
    const report = buildWeekAuditReport({
      varietySeed: "repeat-check",
      weekRotationKey: "2026-05-18",
    });
    expect(report.days).toHaveLength(7);
    expect(report.summary.totalStretchSlots).toBeGreaterThan(0);
    // Report is useful even when empty repeats
    expect(Array.isArray(report.stretchRepeatsAcrossWeek)).toBe(true);
  });
});
