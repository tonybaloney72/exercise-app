import type { Exercise, ExerciseCategory } from "@/types";

/** Bump when curated ladders change (invalidates generated-week fingerprint). */
export const PROGRESSION_FAMILIES_VERSION = "2026-05-v1";

export type ProgressionBranch = "bodyweight" | "loaded";

export type ProgressionFamilyId =
  | "push_horizontal"
  | "pull_vertical"
  | "pull_horizontal_bw"
  | "squat_bw"
  | "lunge_bw"
  | "hip_extension_bw"
  | "hip_thrust_loaded";

export type ProgressionFamilyEntry = {
  exerciseId: string;
  step: number;
  branch?: ProgressionBranch;
};

export type ProgressionFamilyDef = {
  id: ProgressionFamilyId;
  label: string;
  /** Primary slot category when this family is used for regression filtering. */
  category: ExerciseCategory;
  entries: ProgressionFamilyEntry[];
};

/**
 * Curated progression ladders (P4b). Most catalog exercises have no entry.
 * Do not infer from names — extend this manifest deliberately.
 */
export const PROGRESSION_FAMILIES: ProgressionFamilyDef[] = [
  {
    id: "push_horizontal",
    label: "Horizontal push (push-up)",
    category: "UP",
    entries: [
      { exerciseId: "UP-6", step: 1 },
      { exerciseId: "UP-1", step: 2 },
      { exerciseId: "UP-4", step: 2 },
      { exerciseId: "UP-2", step: 2 },
      { exerciseId: "UP-7", step: 2 },
      { exerciseId: "HC-226", step: 3 },
      { exerciseId: "HC-135", step: 4 },
      { exerciseId: "PC-41", step: 5 },
    ],
  },
  {
    id: "pull_vertical",
    label: "Vertical pull (pull-up bar)",
    category: "UPL",
    entries: [
      { exerciseId: "UPL-10", step: 1 },
      { exerciseId: "UPL-7", step: 2 },
      { exerciseId: "UPL-8", step: 2 },
      { exerciseId: "HC-225", step: 2 },
      { exerciseId: "UPL-9", step: 4 },
      { exerciseId: "UPL-13", step: 5 },
    ],
  },
  {
    id: "pull_horizontal_bw",
    label: "Horizontal pull (bodyweight rows)",
    category: "UPL",
    entries: [
      { exerciseId: "UPL-14", step: 1 },
      { exerciseId: "UPL-1", step: 2 },
      { exerciseId: "UPL-11", step: 3 },
    ],
  },
  {
    id: "squat_bw",
    label: "Bodyweight squat",
    category: "LB",
    entries: [
      { exerciseId: "HC-137", step: 1 },
      { exerciseId: "LB-1", step: 2 },
      { exerciseId: "LB-7", step: 2 },
      { exerciseId: "LB-5", step: 2 },
    ],
  },
  {
    id: "lunge_bw",
    label: "Bodyweight lunge / split squat",
    category: "LB",
    entries: [
      { exerciseId: "LB-3", step: 1 },
      { exerciseId: "LB-2", step: 2 },
      { exerciseId: "LB-8", step: 2 },
      { exerciseId: "LB-4", step: 4 },
    ],
  },
  {
    id: "hip_extension_bw",
    label: "Hip extension (glute bridge → hip thrust)",
    category: "LB",
    entries: [
      { exerciseId: "CS-5", step: 1, branch: "bodyweight" },
      { exerciseId: "HC-189", step: 2, branch: "bodyweight" },
      { exerciseId: "LB-9", step: 3, branch: "bodyweight" },
    ],
  },
  {
    id: "hip_thrust_loaded",
    label: "Loaded hip thrust",
    category: "LB",
    entries: [
      { exerciseId: "HC-140", step: 2, branch: "loaded" },
      { exerciseId: "HC-191", step: 3, branch: "loaded" },
    ],
  },
];

export type ExerciseProgressionMeta = {
  familyId: ProgressionFamilyId;
  step: number;
  branch?: ProgressionBranch;
};

function buildProgressionByExerciseId(): Map<string, ExerciseProgressionMeta> {
  const map = new Map<string, ExerciseProgressionMeta>();
  for (const family of PROGRESSION_FAMILIES) {
    for (const entry of family.entries) {
      const branch = entry.branch;
      const existing = map.get(entry.exerciseId);
      if (existing && existing.familyId !== family.id) {
        throw new Error(
          `progressionFamilies: ${entry.exerciseId} appears in both ${existing.familyId} and ${family.id}`,
        );
      }
      map.set(entry.exerciseId, {
        familyId: family.id,
        step: entry.step,
        branch,
      });
    }
  }
  return map;
}

export const progressionByExerciseId = buildProgressionByExerciseId();

export function getExerciseProgression(
  exerciseId: string,
): ExerciseProgressionMeta | undefined {
  return progressionByExerciseId.get(exerciseId);
}

export function getProgressionFamily(
  id: ProgressionFamilyId,
): ProgressionFamilyDef | undefined {
  return PROGRESSION_FAMILIES.find((f) => f.id === id);
}

/** Merge curated progression metadata onto catalog exercises (immutable copy). */
export function applyProgressionMetadata(exerciseList: Exercise[]): Exercise[] {
  return exerciseList.map((ex) => {
    const progression = progressionByExerciseId.get(ex.id);
    if (!progression) return ex;
    return {
      ...ex,
      progressionFamilyId: progression.familyId,
      progressionStep: progression.step,
      progressionBranch: progression.branch,
    };
  });
}
