import type { ExerciseCategory, TrainingPriorityPreset } from "@/types";

/** Coarse buckets for automation (A1 presets map to weight vectors). */
export type EmphasisGroup =
  | "core"
  | "cardio"
  | "lower"
  | "upper_push"
  | "upper_pull";

export const EMPHASIS_GROUP_ORDER: EmphasisGroup[] = [
  "core",
  "cardio",
  "lower",
  "upper_push",
  "upper_pull",
];

export type TrainingPriorityWeights = Record<EmphasisGroup, number>;

/** Internal scores (sum = 10). Not shown in UI for A1. */
export const TRAINING_PRIORITY_PRESET_WEIGHTS: Record<
  TrainingPriorityPreset,
  TrainingPriorityWeights
> = {
  balanced: { core: 2, cardio: 2, lower: 2, upper_push: 2, upper_pull: 2 },
  core_emphasis: { core: 4, cardio: 2, lower: 2, upper_push: 1, upper_pull: 1 },
  conditioning: { core: 2, cardio: 4, lower: 2, upper_push: 1, upper_pull: 1 },
  lower_body: { core: 2, cardio: 2, lower: 4, upper_push: 1, upper_pull: 1 },
  upper_body: { core: 2, cardio: 1, lower: 2, upper_push: 3, upper_pull: 2 },
  minimal_core: { core: 1, cardio: 2, lower: 3, upper_push: 2, upper_pull: 2 },
  strength: { core: 2, cardio: 2, lower: 3, upper_push: 2, upper_pull: 1 },
};

export type TrainingPriorityOption = {
  value: TrainingPriorityPreset;
  label: string;
  description: string;
};

export const TRAINING_PRIORITY_OPTIONS: TrainingPriorityOption[] = [
  {
    value: "balanced",
    label: "Balanced",
    description:
      "Even emphasis across core, cardio, legs, and upper body. Follows each day's theme from the weekly template.",
  },
  {
    value: "minimal_core",
    label: "Minimal core",
    description:
      "Less core volume when rounds are short; more room for legs, push, pull, and cardio.",
  },
  {
    value: "core_emphasis",
    label: "Core emphasis",
    description:
      "Prioritizes core work (flexion, lower abs, rotation, stability). Upper and legs still appear on their themed days.",
  },
  {
    value: "strength",
    label: "Strength emphasis",
    description:
      "Prioritizes push, pull, and leg strength. Core and cardio stay in the mix on themed days.",
  },
  {
    value: "lower_body",
    label: "Lower body emphasis",
    description:
      "Prioritizes leg and glute work. Useful when you want more LB slots on mixed days.",
  },
  {
    value: "upper_body",
    label: "Upper body emphasis",
    description:
      "Prioritizes push and pull. Legs and core still show up on their scheduled days.",
  },
  {
    value: "conditioning",
    label: "Conditioning emphasis",
    description:
      "Prioritizes cardio and plyo (PC). Helpful for more metabolic work within each day.",
  },
];

const GROUP_TO_CATEGORIES: Record<EmphasisGroup, ExerciseCategory[]> = {
  core: ["CF", "CL", "CR", "CS"],
  cardio: ["PC"],
  lower: ["LB"],
  upper_push: ["UP"],
  upper_pull: ["UPL"],
};

/** Extra categories a preset may pull into a day beyond the catalog pool. */
const EXTRA_CATEGORIES_BY_PRESET: Record<
  TrainingPriorityPreset,
  ExerciseCategory[]
> = {
  balanced: [],
  minimal_core: ["UP", "UPL", "LB", "PC"],
  core_emphasis: ["CF", "CL", "CR", "CS"],
  strength: ["UP", "UPL", "LB"],
  lower_body: ["LB"],
  upper_body: ["UP", "UPL"],
  conditioning: ["PC"],
};

export function weightsForPreset(
  preset: TrainingPriorityPreset,
): TrainingPriorityWeights {
  return { ...TRAINING_PRIORITY_PRESET_WEIGHTS[preset] };
}

export function emphasisGroupForCategory(
  category: ExerciseCategory,
): EmphasisGroup | null {
  for (const group of EMPHASIS_GROUP_ORDER) {
    if (GROUP_TO_CATEGORIES[group].includes(category)) return group;
  }
  return null;
}

/** Higher = keep longer when trimming / prefer when filling slots. */
export function categoryPriorityScore(
  category: ExerciseCategory,
  weights: TrainingPriorityWeights,
): number {
  const group = emphasisGroupForCategory(category);
  if (!group) return 1;
  return weights[group];
}

export function extraCategoriesForPreset(
  preset: TrainingPriorityPreset,
): ExerciseCategory[] {
  return [...EXTRA_CATEGORIES_BY_PRESET[preset]];
}

export function isBalancedPreset(preset: TrainingPriorityPreset): boolean {
  return preset === "balanced";
}

export function sanitizeTrainingPriorityPreset(
  raw: unknown,
): TrainingPriorityPreset {
  if (
    raw === "balanced" ||
    raw === "minimal_core" ||
    raw === "core_emphasis" ||
    raw === "strength" ||
    raw === "lower_body" ||
    raw === "upper_body" ||
    raw === "conditioning"
  ) {
    return raw;
  }
  return "balanced";
}

/** Fingerprint segment for prefs / week regen. */
export function trainingPriorityFingerprint(
  preset: TrainingPriorityPreset,
): string {
  const w = weightsForPreset(preset);
  return `tp:${preset}|${EMPHASIS_GROUP_ORDER.map((g) => w[g]).join(",")}`;
}
