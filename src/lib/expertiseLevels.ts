import {
  emphasisGroupForCategory,
  EMPHASIS_GROUP_LABELS,
  type EmphasisGroup,
} from "@/lib/trainingPriorities";
import type {
  Exercise,
  ExerciseCategory,
  ExpertiseByGroup,
  ExpertiseLevel,
} from "@/types";

export const EXPERTISE_LEVEL_ORDER: ExpertiseLevel[] = [
  "beginner",
  "novice",
  "intermediate",
  "advanced",
  "expert",
];

export const EXPERTISE_LEVEL_LABELS: Record<ExpertiseLevel, string> = {
  beginner: "Beginner",
  novice: "Novice",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

export const DEFAULT_EXPERTISE_BY_GROUP: ExpertiseByGroup = {
  core: "intermediate",
  cardio: "intermediate",
  lower: "intermediate",
  upper_push: "intermediate",
  upper_pull: "intermediate",
};

export function expertiseRank(level: ExpertiseLevel): number {
  return EXPERTISE_LEVEL_ORDER.indexOf(level);
}

export function sanitizeExpertiseLevel(raw: unknown): ExpertiseLevel {
  if (
    typeof raw === "string" &&
    EXPERTISE_LEVEL_ORDER.includes(raw as ExpertiseLevel)
  ) {
    return raw as ExpertiseLevel;
  }
  return "intermediate";
}

export function sanitizeExpertiseByGroup(
  raw: unknown,
  fallback: ExpertiseByGroup = DEFAULT_EXPERTISE_BY_GROUP,
): ExpertiseByGroup {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Record<string, unknown>;
  const out = { ...fallback };
  for (const g of Object.keys(DEFAULT_EXPERTISE_BY_GROUP) as EmphasisGroup[]) {
    if (g in o) out[g] = sanitizeExpertiseLevel(o[g]);
  }
  return out;
}

export function expertiseByGroupEqual(a: ExpertiseByGroup, b: ExpertiseByGroup): boolean {
  return (Object.keys(DEFAULT_EXPERTISE_BY_GROUP) as EmphasisGroup[]).every(
    (g) => a[g] === b[g],
  );
}

export type ExpertiseFilter = { byGroup: ExpertiseByGroup };

/** Sanitized per-group caps; defaults to intermediate for every group. */
export function resolveExpertiseFilter(settings: {
  expertiseByGroup?: ExpertiseByGroup;
}): ExpertiseFilter {
  return {
    byGroup: sanitizeExpertiseByGroup(
      settings.expertiseByGroup,
      DEFAULT_EXPERTISE_BY_GROUP,
    ),
  };
}

export function exerciseExpertiseLevel(exercise: Exercise): ExpertiseLevel {
  return exercise.expertiseLevel ?? "intermediate";
}

/**
 * True when the exercise is at or below the user's declared cap for its emphasis group.
 * Unknown categories (e.g. stretches) are not capped.
 */
export function exerciseMeetsExpertiseCap(
  exercise: Exercise,
  slotCategory: ExerciseCategory,
  byGroup: ExpertiseByGroup,
): boolean {
  const group = emphasisGroupForCategory(slotCategory);
  if (!group) return true;
  const cap = expertiseRank(byGroup[group]);
  const level = expertiseRank(exerciseExpertiseLevel(exercise));
  return level <= cap;
}

export function expertiseByGroupFingerprint(byGroup: ExpertiseByGroup): string {
  return (Object.keys(DEFAULT_EXPERTISE_BY_GROUP) as EmphasisGroup[])
    .map((g) => `${g}:${byGroup[g]}`)
    .join(",");
}

export function describeExpertiseByGroup(byGroup: ExpertiseByGroup): string {
  return (Object.keys(DEFAULT_EXPERTISE_BY_GROUP) as EmphasisGroup[])
    .map((g) => `${EMPHASIS_GROUP_LABELS[g]} ${EXPERTISE_LEVEL_LABELS[byGroup[g]]}`)
    .join(" · ");
}
