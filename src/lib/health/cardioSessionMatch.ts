import type { WorkoutType } from "@capgo/capacitor-health";
import type { CardioActivityKind } from "@/types";
import { cardioKindToWorkoutType } from "@/lib/health/cardioKindMap";
import type { ImportedCardioSession } from "@/lib/health/cardioHealth";

/** Fraction of the user window covered by a session interval (0–1). */
export function sessionOverlapFraction(
  userStartMs: number,
  userEndMs: number,
  sessionStartMs: number,
  sessionEndMs: number,
): number {
  const overlapStart = Math.max(userStartMs, sessionStartMs);
  const overlapEnd = Math.min(userEndMs, sessionEndMs);
  if (overlapEnd <= overlapStart) return 0;
  const userSpan = userEndMs - userStartMs;
  if (userSpan <= 0) return 0;
  return (overlapEnd - overlapStart) / userSpan;
}

const KIND_COMPATIBLE_TYPES: Partial<
  Record<CardioActivityKind, readonly WorkoutType[]>
> = {
  walk: ["walking", "hiking", "stairClimbing", "mixedCardio", "other"],
  jog: ["running", "runningTreadmill", "mixedCardio", "other"],
  hike: ["hiking", "walking", "climbing", "other"],
  cycle: ["cycling", "bikingStationary", "handCycling", "other"],
  swim: ["swimming", "swimmingPool", "swimmingOpenWater", "waterFitness", "other"],
};

const STRENGTH_TYPES: ReadonlySet<WorkoutType> = new Set([
  "strengthTraining",
  "traditionalStrengthTraining",
  "functionalStrengthTraining",
  "weightlifting",
  "coreTraining",
  "crossTraining",
]);

export function cardioSessionTypeMatchScore(
  kind: CardioActivityKind,
  workoutType?: string,
): number {
  if (!workoutType) return 0.2;
  const expected = cardioKindToWorkoutType(kind);
  if (workoutType === expected) return 1;
  const compatible = KIND_COMPATIBLE_TYPES[kind];
  if (compatible?.includes(workoutType as WorkoutType)) return 0.75;
  if (workoutType === "other" || workoutType === "mixedCardio") return 0.4;
  if (STRENGTH_TYPES.has(workoutType as WorkoutType)) return 0;
  return 0.15;
}

export function cardioDistanceAgreementScore(
  gpsDistanceMi?: number,
  sessionDistanceMi?: number,
): number {
  if (
    gpsDistanceMi == null ||
    gpsDistanceMi <= 0 ||
    sessionDistanceMi == null ||
    sessionDistanceMi <= 0
  ) {
    return 0.5;
  }
  const diff = Math.abs(gpsDistanceMi - sessionDistanceMi);
  const denom = Math.max(gpsDistanceMi, sessionDistanceMi, 0.1);
  return Math.max(0, 1 - diff / denom);
}

export type ScoredCardioSession = {
  session: ImportedCardioSession;
  score: number;
  overlap: number;
};

export function scoreCardioSessionForWindow(options: {
  kind: CardioActivityKind;
  userStartMs: number;
  userEndMs: number;
  session: ImportedCardioSession;
  gpsDistanceMi?: number;
}): ScoredCardioSession | null {
  const sessionStartMs = options.session.startDate.getTime();
  const sessionEndMs = options.session.endDate.getTime();
  const overlap = sessionOverlapFraction(
    options.userStartMs,
    options.userEndMs,
    sessionStartMs,
    sessionEndMs,
  );
  if (overlap < 0.25) return null;

  const typeScore = cardioSessionTypeMatchScore(
    options.kind,
    options.session.workoutType,
  );
  if (typeScore <= 0) return null;

  const distScore = cardioDistanceAgreementScore(
    options.gpsDistanceMi,
    options.session.distanceMi,
  );
  const hasDistance =
    options.session.distanceMi != null && options.session.distanceMi > 0.05;

  let score = overlap * 40 + typeScore * 25 + distScore * 25;
  if (hasDistance) score += 10;

  return { session: options.session, score, overlap };
}

export function rankCardioSessionsForWindow(options: {
  kind: CardioActivityKind;
  userStartMs: number;
  userEndMs: number;
  sessions: readonly ImportedCardioSession[];
  gpsDistanceMi?: number;
}): ScoredCardioSession[] {
  const scored: ScoredCardioSession[] = [];
  for (const session of options.sessions) {
    const row = scoreCardioSessionForWindow({
      kind: options.kind,
      userStartMs: options.userStartMs,
      userEndMs: options.userEndMs,
      session,
      gpsDistanceMi: options.gpsDistanceMi,
    });
    if (row) scored.push(row);
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export const CARDIO_SESSION_AUTO_PICK_MIN_SCORE = 55;
export const CARDIO_SESSION_AUTO_PICK_MIN_GAP = 12;

export function pickBestCardioSession(
  ranked: readonly ScoredCardioSession[],
): ScoredCardioSession | null {
  if (ranked.length === 0) return null;
  const top = ranked[0]!;
  if (top.score < CARDIO_SESSION_AUTO_PICK_MIN_SCORE) return null;
  const second = ranked[1];
  if (second && top.score - second.score < CARDIO_SESSION_AUTO_PICK_MIN_GAP) {
    return null;
  }
  return top;
}

/** Retroactive import: prefer matching type and distance-present sessions. */
export function rankCardioSessionsForImport(
  kind: CardioActivityKind,
  sessions: readonly ImportedCardioSession[],
): ScoredCardioSession[] {
  const now = Date.now();
  const scored = sessions
    .map((session) => {
      const typeScore = cardioSessionTypeMatchScore(kind, session.workoutType);
      if (typeScore <= 0) return null;
      const ageHours = (now - session.startDate.getTime()) / (60 * 60 * 1000);
      const recency = Math.max(0, 1 - ageHours / 48);
      const hasDistance = session.distanceMi != null && session.distanceMi > 0;
      const score = typeScore * 50 + recency * 30 + (hasDistance ? 20 : 0);
      return {
        session,
        score,
        overlap: recency,
      } satisfies ScoredCardioSession;
    })
    .filter((row): row is ScoredCardioSession => row != null);
  scored.sort((a, b) => b.score - a.score);
  return scored;
}
