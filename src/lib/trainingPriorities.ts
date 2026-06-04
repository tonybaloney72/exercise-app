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

/** Per-group emphasis (0 = skip, 4 = peak). Drives generator and A2 customize UI. */
export type TrainingPriorityScore = 0 | 1 | 2 | 3 | 4;
export type TrainingPriorityScores = Record<EmphasisGroup, TrainingPriorityScore>;

export const EMPHASIS_GROUP_LABELS: Record<EmphasisGroup, string> = {
  core: "Core",
  cardio: "Cardio",
  lower: "Lower body",
  upper_push: "Push",
  upper_pull: "Pull",
};

/** Preset weight table (sum = 10); maps 1:1 to 0–4 scores for presets. */
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

type TrainingPriorityOption = {
  value: TrainingPriorityPreset;
  label: string;
  description: string;
};

const TRAINING_PRIORITY_OPTIONS: TrainingPriorityOption[] = [
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

function clampTrainingPriorityScore(raw: unknown): TrainingPriorityScore {
  const n = typeof raw === "number" ? Math.round(raw) : Number(raw);
  if (n <= 0) return 0;
  if (n >= 4) return 4;
  return n as TrainingPriorityScore;
}

export function sanitizeTrainingPriorityScores(
  raw: unknown,
  fallback?: TrainingPriorityScores,
): TrainingPriorityScores {
  const base = fallback ?? scoresFromPreset("balanced");
  if (!raw || typeof raw !== "object") return { ...base };
  const o = raw as Record<string, unknown>;
  const out = { ...base };
  for (const g of EMPHASIS_GROUP_ORDER) {
    if (g in o) out[g] = clampTrainingPriorityScore(o[g]);
  }
  return out;
}

function scoresFromWeights(
  weights: TrainingPriorityWeights,
): TrainingPriorityScores {
  const out = {} as TrainingPriorityScores;
  for (const g of EMPHASIS_GROUP_ORDER) {
    out[g] = clampTrainingPriorityScore(weights[g]);
  }
  return out;
}

export function scoresFromPreset(
  preset: TrainingPriorityPreset,
): TrainingPriorityScores {
  return scoresFromWeights(weightsForPreset(preset));
}

export function weightsFromScores(
  scores: TrainingPriorityScores,
): TrainingPriorityWeights {
  return { ...scores };
}

export function scoresEqual(
  a: TrainingPriorityScores,
  b: TrainingPriorityScores,
): boolean {
  return EMPHASIS_GROUP_ORDER.every((g) => a[g] === b[g]);
}

export function totalEmphasisScore(scores: TrainingPriorityScores): number {
  return EMPHASIS_GROUP_ORDER.reduce((sum, g) => sum + scores[g], 0);
}

export function isBalancedScores(scores: TrainingPriorityScores): boolean {
  return EMPHASIS_GROUP_ORDER.every((g) => scores[g] === 2);
}

export function weightsForPreset(
  preset: TrainingPriorityPreset,
): TrainingPriorityWeights {
  return { ...TRAINING_PRIORITY_PRESET_WEIGHTS[preset] };
}

export function resolveTrainingPriorityScores(settings: {
  trainingPriorityPreset: TrainingPriorityPreset;
  trainingPriorityScores?: TrainingPriorityScores;
}): TrainingPriorityScores {
  const scores = settings.trainingPriorityScores
    ? sanitizeTrainingPriorityScores(settings.trainingPriorityScores)
    : scoresFromPreset(settings.trainingPriorityPreset);
  if (totalEmphasisScore(scores) === 0) {
    return scoresFromPreset("balanced");
  }
  return scores;
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

function extraCategoriesForPreset(
  preset: TrainingPriorityPreset,
): ExerciseCategory[] {
  return [...EXTRA_CATEGORIES_BY_PRESET[preset]];
}

/** Groups scored ≥ 3 may add categories beyond the day theme (custom / A2). */
function extraCategoriesForScores(
  scores: TrainingPriorityScores,
): ExerciseCategory[] {
  const out: ExerciseCategory[] = [];
  for (const group of EMPHASIS_GROUP_ORDER) {
    if (scores[group] < 3) continue;
    for (const cat of GROUP_TO_CATEGORIES[group]) {
      if (!out.includes(cat)) out.push(cat);
    }
  }
  return out;
}

export function extraCategoriesForProfile(
  preset: TrainingPriorityPreset,
  scores: TrainingPriorityScores,
  customized: boolean,
): ExerciseCategory[] {
  if (!customized) return extraCategoriesForPreset(preset);
  return extraCategoriesForScores(scores);
}

function isBalancedPreset(preset: TrainingPriorityPreset): boolean {
  return preset === "balanced";
}

export function isBalancedProfile(
  scores: TrainingPriorityScores,
  customized: boolean,
): boolean {
  if (!customized) return isBalancedScores(scores);
  return isBalancedScores(scores);
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

/** Fingerprint segment for prefs / week regen (includes 0–4 scores). */
export function trainingPriorityFingerprint(
  preset: TrainingPriorityPreset,
  scores: TrainingPriorityScores,
  customized = false,
): string {
  const seg = EMPHASIS_GROUP_ORDER.map((g) => scores[g]).join(",");
  return customized ? `tp:custom|${seg}` : `tp:${preset}|${seg}`;
}

const GROUP_PREVIEW_NAMES: Record<EmphasisGroup, string> = {
  core: "core",
  cardio: "cardio",
  lower: "legs",
  upper_push: "push",
  upper_pull: "pull",
};

/** Live preview line for Settings customize panel. */
export function describeTrainingPriorityScores(
  scores: TrainingPriorityScores,
): string {
  const ranked = EMPHASIS_GROUP_ORDER.filter((g) => scores[g] > 0).sort(
    (a, b) => scores[b] - scores[a] || EMPHASIS_GROUP_ORDER.indexOf(a) - EMPHASIS_GROUP_ORDER.indexOf(b),
  );
  if (ranked.length === 0) {
    return "No emphasis groups selected — using balanced defaults.";
  }
  const strong = ranked.filter((g) => scores[g] >= 3).map((g) => GROUP_PREVIEW_NAMES[g]);
  const moderate = ranked.filter((g) => scores[g] === 2).map((g) => GROUP_PREVIEW_NAMES[g]);
  const parts: string[] = [];
  if (strong.length > 0) {
    parts.push(`Stronger ${formatNameList(strong)} on mixed days`);
  } else if (moderate.length > 0) {
    parts.push(`Moderate ${formatNameList(moderate)} across the week`);
  } else {
    parts.push(`Light emphasis on ${formatNameList(ranked.map((g) => GROUP_PREVIEW_NAMES[g]))}`);
  }
  const skipped = EMPHASIS_GROUP_ORDER.filter((g) => scores[g] === 0).map(
    (g) => GROUP_PREVIEW_NAMES[g],
  );
  if (skipped.length > 0 && skipped.length < EMPHASIS_GROUP_ORDER.length) {
    parts.push(`less ${formatNameList(skipped)} unless the day theme includes it`);
  }
  parts.push("themed days still follow the weekly template");
  return `${parts[0]}; ${parts.slice(1).join("; ")}.`;
}

function formatNameList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}
