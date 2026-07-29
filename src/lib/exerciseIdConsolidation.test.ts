import { describe, expect, it } from "vitest";
import { exerciseMap } from "@/core/catalog";
import {
  CONSOLIDATED_EXERCISE_ID_MAP,
  migrateConsolidatedExerciseId,
  REMOVED_CATALOG_EXERCISE_IDS,
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
    expect(migrateConsolidatedExerciseId("SC-20")).toBe("SC-15");
    expect(migrateConsolidatedExerciseId("SC-28")).toBe("SC-8");
    expect(migrateConsolidatedExerciseId("HC-243")).toBe("SW-10");
    expect(migrateConsolidatedExerciseId("PC-25")).toBe("PC-22");
    expect(migrateConsolidatedExerciseId("HC-137")).toBe("SC-23");
    expect(migrateConsolidatedExerciseId("HC-216")).toBe("SW-23");
    expect(migrateConsolidatedExerciseId("HC-186")).toBe("SW-48");
    expect(migrateConsolidatedExerciseId("PC-12")).toBe("PC-31");
    expect(migrateConsolidatedExerciseId("HC-139")).toBe("UP-5");
    expect(migrateConsolidatedExerciseId("CR-7")).toBe("CR-8");
    expect(migrateConsolidatedExerciseId("HC-083")).toBe("HC-143");
    expect(migrateConsolidatedExerciseId("HC-142")).toBe("HC-082");
    expect(migrateConsolidatedExerciseId("HC-061")).toBe("HC-082");
    expect(migrateConsolidatedExerciseId("HC-062")).toBe("HC-082");
    expect(migrateConsolidatedExerciseId("LB-12")).toBe("LB-3");
    expect(migrateConsolidatedExerciseId("HC-294")).toBe("HC-257");
    expect(migrateConsolidatedExerciseId("HC-295")).toBe("HC-257");
    expect(migrateConsolidatedExerciseId("HC-159")).toBe("HC-072");
    expect(migrateConsolidatedExerciseId("HC-296")).toBe("LB-7");
    expect(migrateConsolidatedExerciseId("HC-290")).toBe("CR-4");
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
    for (const id of REMOVED_CATALOG_EXERCISE_IDS) {
      expect(exerciseMap[id], `catalog ${id}`).toBeUndefined();
    }
  });

  it("exports every consolidation target", () => {
    const targets = new Set(Object.values(CONSOLIDATED_EXERCISE_ID_MAP));
    for (const id of targets) {
      expect(exerciseMap[id], `target ${id}`).toBeDefined();
    }
  });

  it("canonical load-variant targets support optional free weights", () => {
    expect(exerciseMap["HC-082"]?.equipment).toEqual(
      expect.arrayContaining(["bodyweight", "dumbbell", "barbell"]),
    );
    expect(exerciseMap["LB-3"]?.equipment).toEqual(
      expect.arrayContaining(["bodyweight", "dumbbell", "kettlebell"]),
    );
    expect(exerciseMap["HC-072"]?.name).toBe("Romanian Deadlift");
    expect(exerciseMap["LB-1"]?.name).toBe("Squats");
    expect(exerciseMap["LB-1"]?.equipment).toEqual(
      expect.arrayContaining(["bodyweight", "dumbbell", "barbell"]),
    );
    expect(exerciseMap["HC-189"]?.equipment).toEqual(
      expect.arrayContaining(["bodyweight", "dumbbell", "barbell"]),
    );
    expect(exerciseMap["CR-4"]?.equipment).toEqual(
      expect.arrayContaining(["bodyweight", "dumbbell"]),
    );
    expect(exerciseMap["LB-7"]?.equipment).toEqual(
      expect.arrayContaining(["bodyweight", "dumbbell", "barbell"]),
    );
  });
});
