import { describe, expect, it } from "vitest";
import { exerciseMap } from "@/data/exercises";
import {
  CONSOLIDATED_EXERCISE_ID_MAP,
  migrateConsolidatedExerciseId,
  REMOVED_CATALOG_STRETCH_IDS,
  REMOVED_HYBRID_EXERCISE_IDS,
} from "@/lib/exerciseIdConsolidation";
import { migrateExerciseId } from "@/lib/cpToPcMigration";

describe("exerciseIdConsolidation", () => {
  it("maps deprecated ids to canonical targets", () => {
    expect(migrateConsolidatedExerciseId("HC-241")).toBe("CR-4");
    expect(migrateConsolidatedExerciseId("SW-15")).toBe("CS-5");
    expect(migrateConsolidatedExerciseId("SW-20")).toBe("LB-1");
    expect(migrateConsolidatedExerciseId("PC-3")).toBe("CR-10");
    expect(migrateConsolidatedExerciseId("SW-40")).toBe("SW-33");
    expect(migrateConsolidatedExerciseId("SW-51")).toBe("SW-8");
    expect(migrateConsolidatedExerciseId("SW-52")).toBe("CS-3");
    expect(migrateConsolidatedExerciseId("SW-44")).toBe("PC-1");
  });

  it("chains CP rename then consolidation", () => {
    expect(migrateExerciseId("CP-1")).toBe("PC-1");
    expect(migrateExerciseId("HC-178")).toBe("CS-5");
  });

  it("does not export removed library entries", () => {
    for (const id of REMOVED_HYBRID_EXERCISE_IDS) {
      expect(exerciseMap[id], `hybrid ${id}`).toBeUndefined();
    }
    for (const id of REMOVED_CATALOG_STRETCH_IDS) {
      expect(exerciseMap[id], `stretch ${id}`).toBeUndefined();
    }
  });

  it("exports every consolidation target", () => {
    const targets = new Set(Object.values(CONSOLIDATED_EXERCISE_ID_MAP));
    for (const id of targets) {
      expect(exerciseMap[id], `target ${id}`).toBeDefined();
    }
  });
});
