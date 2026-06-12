import type { Exercise } from "@/types";
import { exerciseVideoLinkLabel } from "@/lib/exerciseVideoLink";

export type UserFeedbackSource = "exercise_row" | "library" | "settings";

export type ExerciseFeedbackCategory =
  | "wrong_description"
  | "bad_link"
  | "other";

export const EXERCISE_FEEDBACK_CATEGORY_LABELS: Record<
  ExerciseFeedbackCategory,
  string
> = {
  wrong_description: "Wrong description",
  bad_link: "Broken or incorrect link",
  other: "Other",
};

export type GeneralFeedbackCategory = "bug" | "suggestion" | "other";

export const GENERAL_FEEDBACK_CATEGORY_LABELS: Record<
  GeneralFeedbackCategory,
  string
> = {
  bug: "Bug",
  suggestion: "Suggestion",
  other: "Other",
};

const SNAPSHOT_DESCRIPTION_MAX = 500;
const RATE_LIMIT_KEY = "user_feedback_submit_times";
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

export type ExerciseFeedbackSnapshots = {
  snapshotName: string;
  snapshotDescription: string | null;
  snapshotLink: string | null;
  snapshotLinkLabel: string | null;
};

export function buildExerciseFeedbackSnapshots(
  exercise: Pick<Exercise, "name" | "notes" | "videoUrl">,
): ExerciseFeedbackSnapshots {
  const notes = exercise.notes?.trim() ?? "";
  const snapshotDescription =
    notes.length > SNAPSHOT_DESCRIPTION_MAX
      ? `${notes.slice(0, SNAPSHOT_DESCRIPTION_MAX)}…`
      : notes || null;
  const snapshotLink = exercise.videoUrl?.trim() || null;
  return {
    snapshotName: exercise.name,
    snapshotDescription,
    snapshotLink,
    snapshotLinkLabel: snapshotLink
      ? exerciseVideoLinkLabel(snapshotLink)
      : null,
  };
}

export type FeedbackContext = {
  route?: string;
  userAgent?: string;
  [key: string]: unknown;
};

export function buildFeedbackContext(
  extra?: Record<string, unknown>,
): FeedbackContext | null {
  if (typeof window === "undefined") return extra ?? null;
  const route = window.location.pathname;
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : undefined;
  return { route, userAgent, ...extra };
}

function readRateLimitTimes(): number[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is number => typeof t === "number");
  } catch {
    return [];
  }
}

function writeRateLimitTimes(times: number[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(times));
  } catch {
    // ignore quota errors
  }
}

export function feedbackRateLimitBlocked(): boolean {
  const now = Date.now();
  const recent = readRateLimitTimes().filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  return recent.length >= RATE_LIMIT_MAX;
}

export function recordFeedbackSubmit(): void {
  const now = Date.now();
  const recent = readRateLimitTimes().filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  writeRateLimitTimes([...recent, now]);
}

export function validateExerciseFeedbackSubmit(input: {
  category: ExerciseFeedbackCategory | "";
  details: string;
}): string | null {
  if (!input.category) return "Choose an issue type.";
  if (input.category === "other" && !input.details.trim()) {
    return "Please describe the issue.";
  }
  return null;
}

export function validateGeneralFeedbackSubmit(input: {
  category: GeneralFeedbackCategory | "";
  message: string;
}): string | null {
  if (!input.category) return "Choose a category.";
  if (!input.message.trim()) return "Please enter your feedback.";
  return null;
}
