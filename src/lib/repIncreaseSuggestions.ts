import { exerciseMap } from "@/core/catalog";
import {
  parseRepTargetHint,
  parseTimerSecondsHint,
} from "@/lib/exercisePrescriptionHints";
import {
  exerciseSupportsLoadMeta,
  inventoryKindForExercise,
} from "@/lib/exerciseLoad";
import type { ExerciseSettingsMap } from "@/lib/repos";
import { nextHeavierInventoryWeight } from "@/lib/weightInventory";
import type {
  ExerciseLog,
  ExerciseSetMode,
  ExerciseSettingsValues,
  WeightInventory,
  WorkoutLog,
} from "@/types";
import { effectiveExerciseId } from "@/utils/exerciseLogDefaults";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  resolveExerciseSettings,
} from "@/utils/effectiveExerciseSettings";
import { parseLocalDateKeyMs } from "@/utils/localDateKey";

export const REP_INCREASE_MARGIN = 2;
export const REP_INCREASE_BUMP = 2;
export const REP_SUGGESTION_SNOOZE_DAYS = 14;
/** Top of double-progression rep range for loadable exercises. */
const LOAD_REP_RANGE_MAX = 12;
/** Reps after a load jump. */
const LOAD_REP_RANGE_MIN = 8;

export type RepIncreaseMode = "reps" | "timer" | "load";

type RepIncreaseFrequencyBucket = "daily" | "medium" | "weekly";

export interface RepIncreaseSuggestion {
  exerciseId: string;
  mode: RepIncreaseMode;
  currentTarget: number;
  suggestedTarget: number;
  currentWeightLb?: number;
  suggestedWeightLb?: number;
  reason: string;
}

type SessionAppearance = {
  date: string;
  workoutId: string;
  qualified: boolean;
};

function daysBetweenDateKeys(fromKey: string, toKey: string): number {
  const fromMs = parseLocalDateKeyMs(fromKey);
  const toMs = parseLocalDateKeyMs(toKey);
  if (fromMs === 0 || toMs === 0) return 0;
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

function isCompletedWorkout(workout: WorkoutLog): boolean {
  return Boolean(workout.endTime);
}

function logsInWorkoutOrder(workout: WorkoutLog): ExerciseLog[] {
  const out: ExerciseLog[] = [];
  for (const log of workout.warmUpExercises) out.push(log);
  for (const round of workout.rounds) {
    for (const log of round.exercises) out.push(log);
  }
  for (const log of workout.coolDownExercises) out.push(log);
  return out;
}

function finalLogForExercise(
  workout: WorkoutLog,
  exerciseId: string,
): ExerciseLog | undefined {
  let last: ExerciseLog | undefined;
  for (const log of logsInWorkoutOrder(workout)) {
    if (effectiveExerciseId(log) === exerciseId) last = log;
  }
  return last;
}

function resolveLoggingMode(
  log: ExerciseLog,
  exerciseId: string,
  stored: ExerciseSettingsValues | undefined,
): ExerciseSetMode {
  if (log.loggingMode) return log.loggingMode;
  const meta = exerciseMap[exerciseId];
  if (!meta) return "reps";
  return resolveExerciseSettings(meta, stored).defaultSetMode;
}
function resolveLogTarget(
  log: ExerciseLog,
  exerciseId: string,
  stored: ExerciseSettingsValues | undefined,
): { mode: RepIncreaseMode; target: number } | null {
  const meta = exerciseMap[exerciseId];
  if (!meta) return null;

  const mode = resolveLoggingMode(log, exerciseId, stored);

  if (mode === "timer") {
    const target =
      (log.targetDurationSeconds != null && log.targetDurationSeconds > 0
        ? log.targetDurationSeconds
        : undefined) ??
      parseTimerSecondsHint(log.targetPrescription ?? "") ??
      (stored?.defaultSetMode === "timer" &&
      stored.defaultTimerSeconds != null &&
      stored.defaultTimerSeconds > 0
        ? stored.defaultTimerSeconds
        : undefined) ??
      resolveExerciseSettings(meta, stored).defaultTimerSeconds ??
      DEFAULT_TIMER_SECONDS_FALLBACK;
    return { mode: "timer", target };
  }

  const target =
    parseRepTargetHint(log.targetPrescription ?? "") ??
    (stored?.defaultSetMode === "reps" &&
    stored.defaultTargetReps != null &&
    stored.defaultTargetReps > 0
      ? stored.defaultTargetReps
      : undefined) ??
    resolveExerciseSettings(meta, stored).defaultTargetReps ??
    parseRepTargetHint(meta.defaultReps);

  if (target == null || target <= 0) return null;
  return { mode: "reps", target };
}

function readActual(
  log: ExerciseLog,
  mode: RepIncreaseMode,
): number | null {
  if (mode === "reps") {
    return log.actualReps != null ? log.actualReps : null;
  }
  return log.actualDuration != null ? log.actualDuration : null;
}

function isQualifyingLog(
  log: ExerciseLog,
  exerciseId: string,
  stored: ExerciseSettingsValues | undefined,
): boolean {
  if (!log.completed || log.skipped) return false;
  const targetInfo = resolveLogTarget(log, exerciseId, stored);
  if (!targetInfo) return false;
  const actual = readActual(log, targetInfo.mode);
  if (actual == null) return false;
  return actual >= targetInfo.target + REP_INCREASE_MARGIN;
}

function medianGapDays(dates: string[]): number {
  if (dates.length < 2) return 999;
  const sorted = [...dates].sort(
    (a, b) => parseLocalDateKeyMs(a) - parseLocalDateKeyMs(b),
  );
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(daysBetweenDateKeys(sorted[i - 1]!, sorted[i]!));
  }
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  if (gaps.length % 2 === 1) return gaps[mid]!;
  return (gaps[mid - 1]! + gaps[mid]!) / 2;
}

function frequencyBucket(appearances: SessionAppearance[]): RepIncreaseFrequencyBucket {
  const recentDates = appearances
    .slice(-8)
    .map((a) => a.date);
  const gap = medianGapDays(recentDates);
  if (gap <= 3) return "daily";
  if (gap <= 10) return "medium";
  return "weekly";
}

function countTrailingQualified(appearances: SessionAppearance[]): number {
  let count = 0;
  for (let i = appearances.length - 1; i >= 0; i--) {
    if (!appearances[i]!.qualified) break;
    count += 1;
  }
  return count;
}

function meetsThreshold(
  appearances: SessionAppearance[],
  bucket: RepIncreaseFrequencyBucket,
): boolean {
  if (appearances.length === 0) return false;
  if (bucket === "daily") {
    const recent = appearances.slice(-6);
    const hits = recent.filter((a) => a.qualified).length;
    return recent.length >= 6 && hits >= 4;
  }
  return countTrailingQualified(appearances) >= 2;
}

function reasonForBucket(
  appearances: SessionAppearance[],
  bucket: RepIncreaseFrequencyBucket,
): string {
  if (bucket === "daily") {
    const recent = appearances.slice(-6);
    const hits = recent.filter((a) => a.qualified).length;
    return `+${REP_INCREASE_MARGIN} above target in ${hits} of last ${recent.length} sessions`;
  }
  return `+${REP_INCREASE_MARGIN} above target on final set, 2 sessions in a row`;
}

function isSnoozed(
  stored: ExerciseSettingsValues | undefined,
  todayKey: string,
): boolean {
  const until = stored?.repSuggestionSnoozedUntil?.trim();
  if (!until) return false;
  return parseLocalDateKeyMs(until) >= parseLocalDateKeyMs(todayKey);
}

function isIgnored(stored: ExerciseSettingsValues | undefined): boolean {
  return stored?.repSuggestionIgnored === true;
}

function isInCooldown(
  stored: ExerciseSettingsValues | undefined,
  appearances: SessionAppearance[],
  todayKey: string,
  bucket: RepIncreaseFrequencyBucket,
): boolean {
  const lastAccepted = stored?.repSuggestionLastAcceptedAt?.trim();
  if (!lastAccepted) return false;

  const sessionsSince = appearances.filter(
    (a) => parseLocalDateKeyMs(a.date) > parseLocalDateKeyMs(lastAccepted),
  ).length;
  const daysSince = daysBetweenDateKeys(lastAccepted, todayKey);

  if (bucket === "daily") {
    return daysSince < 14 && sessionsSince < 8;
  }
  if (bucket === "medium") {
    return daysSince < 7;
  }
  return sessionsSince < 3;
}

function buildAppearances(
  history: WorkoutLog[],
  exerciseId: string,
  exerciseSettings: ExerciseSettingsMap,
): SessionAppearance[] {
  const appearances: SessionAppearance[] = [];
  const sorted = [...history]
    .filter(isCompletedWorkout)
    .sort((a, b) => {
      const byDate = parseLocalDateKeyMs(a.date) - parseLocalDateKeyMs(b.date);
      if (byDate !== 0) return byDate;
      return a.id.localeCompare(b.id);
    });

  for (const workout of sorted) {
    const finalLog = finalLogForExercise(workout, exerciseId);
    if (!finalLog) continue;
    const stored = exerciseSettings[exerciseId];
    appearances.push({
      date: workout.date,
      workoutId: workout.id,
      qualified: isQualifyingLog(finalLog, exerciseId, stored),
    });
  }
  return appearances;
}

function resolveCurrentTarget(
  exerciseId: string,
  exerciseSettings: ExerciseSettingsMap,
): { mode: "reps" | "timer"; target: number } | null {
  const meta = exerciseMap[exerciseId];
  if (!meta) return null;
  const stored = exerciseSettings[exerciseId];
  const resolved = resolveExerciseSettings(meta, stored);
  if (resolved.defaultSetMode === "timer") {
    const target =
      resolved.defaultTimerSeconds ?? DEFAULT_TIMER_SECONDS_FALLBACK;
    return { mode: "timer", target };
  }
  const target =
    resolved.defaultTargetReps ?? parseRepTargetHint(meta.defaultReps);
  if (target == null || target <= 0) return null;
  return { mode: "reps", target };
}

function exerciseIdsInWorkout(workout: WorkoutLog): string[] {
  const ids = new Set<string>();
  for (const log of logsInWorkoutOrder(workout)) {
    if (!log.completed || log.skipped) continue;
    ids.add(effectiveExerciseId(log));
  }
  return [...ids];
}

export function evaluateRepIncreaseSuggestions(input: {
  history: WorkoutLog[];
  completedWorkout: WorkoutLog;
  todayKey: string;
  exerciseSettings: ExerciseSettingsMap;
  enabled: boolean;
  weightInventory?: WeightInventory;
}): RepIncreaseSuggestion[] {
  const {
    history,
    completedWorkout,
    todayKey,
    exerciseSettings,
    enabled,
    weightInventory = {},
  } = input;

  if (!enabled) return [];
  if (completedWorkout.date !== todayKey) return [];
  if (!isCompletedWorkout(completedWorkout)) return [];

  const suggestions: RepIncreaseSuggestion[] = [];

  for (const exerciseId of exerciseIdsInWorkout(completedWorkout)) {
    const stored = exerciseSettings[exerciseId];
    if (isIgnored(stored) || isSnoozed(stored, todayKey)) continue;

    const finalLog = finalLogForExercise(completedWorkout, exerciseId);
    if (!finalLog || !isQualifyingLog(finalLog, exerciseId, stored)) continue;

    const appearances = buildAppearances(history, exerciseId, exerciseSettings);
    if (appearances.length === 0) continue;

    const bucket = frequencyBucket(appearances);
    if (!meetsThreshold(appearances, bucket)) continue;
    if (isInCooldown(stored, appearances, todayKey, bucket)) continue;

    const current = resolveCurrentTarget(exerciseId, exerciseSettings);
    if (!current) continue;

    const meta = exerciseMap[exerciseId];
    const loadSuggestion = buildLoadProgressionSuggestion({
      exerciseId,
      meta,
      stored,
      finalLog,
      current,
      weightInventory,
      reason: reasonForBucket(appearances, bucket),
    });
    if (loadSuggestion) {
      suggestions.push(loadSuggestion);
      continue;
    }

    const bumped = Math.min(999, current.target + REP_INCREASE_BUMP);
    const capped =
      current.mode === "reps" &&
      exerciseSupportsLoadMeta(meta) &&
      (stored?.defaultWeightLb != null || finalLog.weightLb != null)
        ? Math.min(LOAD_REP_RANGE_MAX, bumped)
        : bumped;

    if (capped <= current.target) continue;

    suggestions.push({
      exerciseId,
      mode: current.mode,
      currentTarget: current.target,
      suggestedTarget: capped,
      reason: reasonForBucket(appearances, bucket),
    });
  }

  return suggestions.sort((a, b) => {
    const nameA = exerciseMap[a.exerciseId]?.name ?? a.exerciseId;
    const nameB = exerciseMap[b.exerciseId]?.name ?? b.exerciseId;
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });
}

function workingWeightLb(
  finalLog: ExerciseLog,
  stored: ExerciseSettingsValues | undefined,
): number | null {
  if (finalLog.weightLb != null && finalLog.weightLb > 0) return finalLog.weightLb;
  if (stored?.defaultWeightLb != null && stored.defaultWeightLb > 0) {
    return stored.defaultWeightLb;
  }
  return null;
}

/** Double-progression load jump when at the rep ceiling with a heavier plate/DB. */
export function buildLoadProgressionSuggestion(input: {
  exerciseId: string;
  meta: (typeof exerciseMap)[string] | undefined;
  stored: ExerciseSettingsValues | undefined;
  finalLog: ExerciseLog;
  current: { mode: "reps" | "timer"; target: number };
  weightInventory: WeightInventory;
  reason: string;
}): RepIncreaseSuggestion | null {
  if (input.current.mode !== "reps") return null;
  if (!exerciseSupportsLoadMeta(input.meta)) return null;
  if (input.current.target < LOAD_REP_RANGE_MAX) return null;

  const currentWeight = workingWeightLb(input.finalLog, input.stored);
  if (currentWeight == null) return null;

  const kind = inventoryKindForExercise(input.meta?.equipment);
  if (!kind) return null;

  const next = nextHeavierInventoryWeight(
    input.weightInventory,
    kind,
    currentWeight,
  );
  if (next == null) return null;

  return {
    exerciseId: input.exerciseId,
    mode: "load",
    currentTarget: input.current.target,
    suggestedTarget: LOAD_REP_RANGE_MIN,
    currentWeightLb: currentWeight,
    suggestedWeightLb: next,
    reason: `${input.reason}; at ${LOAD_REP_RANGE_MAX}+ reps — step up load`,
  };
}

export function formatRepIncreaseTarget(
  mode: RepIncreaseMode,
  value: number,
  weightLb?: number,
): string {
  if (mode === "load") {
    const w =
      weightLb != null && weightLb > 0
        ? Number.isInteger(weightLb)
          ? String(weightLb)
          : weightLb.toFixed(1)
        : "?";
    return `${value} reps @ ${w} lb`;
  }
  return mode === "timer" ? `${value} sec` : `${value} reps`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const parsed = parseLocalDateKeyMs(dateKey);
  if (parsed === 0) return dateKey;
  const d = new Date(parsed);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
