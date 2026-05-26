import { emphasisGroupForCategory } from "@/lib/trainingPriorities";
import {
  DEFAULT_EXPERTISE_BY_GROUP,
  sanitizeExpertiseByGroup,
} from "@/lib/expertiseLevels";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  parseRepTargetHint,
  parseTimerSecondsHint,
} from "@/utils/effectiveExerciseSettings";
import type {
  Exercise,
  ExerciseCategory,
  ExpertiseByGroup,
  ExpertiseLevel,
} from "@/types";

/** Rep volume multiplier by declared cap for the exercise's emphasis group. */
export const REP_VOLUME_MULTIPLIER: Record<ExpertiseLevel, number> = {
  beginner: 0.5,
  novice: 0.65,
  intermediate: 1,
  advanced: 1,
  expert: 1,
};

/** Timer duration multiplier by declared cap for the exercise's emphasis group. */
export const TIMER_DURATION_MULTIPLIER: Record<ExpertiseLevel, number> = {
  beginner: 0.67,
  novice: 0.8,
  intermediate: 1,
  advanced: 1,
  expert: 1,
};

export type PlanPrescriptionOptions = {
  expertiseByGroup?: ExpertiseByGroup;
};

function expertiseCapForCategory(
  category: ExerciseCategory,
  expertiseByGroup?: ExpertiseByGroup,
): ExpertiseLevel | null {
  const group = emphasisGroupForCategory(category);
  if (!group) return null;
  const byGroup = sanitizeExpertiseByGroup(
    expertiseByGroup,
    DEFAULT_EXPERTISE_BY_GROUP,
  );
  return byGroup[group];
}

/** Scale every numeric token in a prescription string, preserving separators and suffix text. */
export function scalePrescriptionNumbers(
  prescription: string,
  multiplier: number,
  opts?: { min?: number; roundTo?: number },
): string {
  if (multiplier >= 1 || !prescription.trim()) return prescription;
  const min = opts?.min ?? 1;
  const roundTo = opts?.roundTo ?? 1;
  let index = 0;
  const nums = (prescription.match(/\d+/g) ?? [])
    .map((x) => parseInt(x, 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
  if (nums.length === 0) return prescription;

  const scaled = nums.map((n) => {
    const raw = n * multiplier;
    const rounded =
      roundTo > 1 ? Math.round(raw / roundTo) * roundTo : Math.round(raw);
    return Math.max(min, Math.min(999, rounded));
  });

  return prescription.replace(/\d+/g, () => String(scaled[index++] ?? min));
}

export function scaleCatalogRepPrescription(
  defaultReps: string,
  category: ExerciseCategory,
  expertiseByGroup?: ExpertiseByGroup,
): string {
  const cap = expertiseCapForCategory(category, expertiseByGroup);
  if (!cap) return defaultReps;
  const multiplier = REP_VOLUME_MULTIPLIER[cap];
  if (multiplier >= 1) return defaultReps;
  return scalePrescriptionNumbers(defaultReps, multiplier, { min: 1 });
}

export function scaleTimerSeconds(
  seconds: number,
  category: ExerciseCategory,
  expertiseByGroup?: ExpertiseByGroup,
): number {
  const cap = expertiseCapForCategory(category, expertiseByGroup);
  if (!cap) return seconds;
  const multiplier = TIMER_DURATION_MULTIPLIER[cap];
  if (multiplier >= 1) return seconds;
  const rounded = Math.round((seconds * multiplier) / 5) * 5;
  return Math.max(5, Math.min(999, rounded));
}

export function scaleCatalogTimerPrescription(
  defaultReps: string,
  category: ExerciseCategory,
  expertiseByGroup?: ExpertiseByGroup,
): string {
  const cap = expertiseCapForCategory(category, expertiseByGroup);
  if (!cap) return defaultReps;
  const multiplier = TIMER_DURATION_MULTIPLIER[cap];
  if (multiplier >= 1) return defaultReps;
  const hint = parseTimerSecondsHint(defaultReps);
  if (hint != null) {
    return `${scaleTimerSeconds(hint, category, expertiseByGroup)} sec`;
  }
  return scalePrescriptionNumbers(defaultReps, multiplier, { min: 5, roundTo: 5 });
}

export function scaledCatalogPrescription(
  exercise: Pick<Exercise, "isTimeBased" | "defaultReps" | "category">,
  expertiseByGroup?: ExpertiseByGroup,
): string {
  if (exercise.isTimeBased) {
    return scaleCatalogTimerPrescription(
      exercise.defaultReps,
      exercise.category,
      expertiseByGroup,
    );
  }
  return scaleCatalogRepPrescription(
    exercise.defaultReps,
    exercise.category,
    expertiseByGroup,
  );
}

export function scaledDefaultTimerSeconds(
  exercise: Pick<Exercise, "isTimeBased" | "defaultReps" | "category">,
  expertiseByGroup?: ExpertiseByGroup,
): number {
  const hint =
    parseTimerSecondsHint(exercise.defaultReps) ??
    DEFAULT_TIMER_SECONDS_FALLBACK;
  return scaleTimerSeconds(hint, exercise.category, expertiseByGroup);
}

/** Best single rep target after expertise scaling (for resolved settings seed). */
export function scaledRepTargetHint(
  defaultReps: string,
  category: ExerciseCategory,
  expertiseByGroup?: ExpertiseByGroup,
): number | undefined {
  const scaled = scaleCatalogRepPrescription(
    defaultReps,
    category,
    expertiseByGroup,
  );
  return parseRepTargetHint(scaled);
}
