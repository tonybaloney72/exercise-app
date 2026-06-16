import { v4 as uuidv4 } from "uuid";
import { exerciseMap } from "@/core/catalog";
import { CARDIO_KIND_TO_EXERCISE_ID } from "@/lib/cardioKinds";
import { hydrateCardioFromNotes } from "@/lib/workoutCardioPersistence";
import { type CardioHealthMeta } from "@/lib/health/cardioHealth";
import { applyCardioHealthMeta } from "@/lib/health/cardioHealthFields";
import type { CardioActivityKind, ExerciseLog, WorkoutLog } from "@/types";

function cardioRows(log: WorkoutLog): ExerciseLog[] {
  return hydrateCardioFromNotes(log).cardioExercises ?? [];
}

function createCardioInstanceId(): string {
  return uuidv4();
}

/** Stable key for patch/remove/toggle (supports duplicate END-* ids). */
export function cardioRowKey(row: ExerciseLog): string {
  return row.cardioInstanceId ?? row.exerciseId;
}

/** Assign instance ids to legacy rows (duplicate exerciseIds get unique ids). */
export function ensureCardioInstanceIds(log: WorkoutLog): WorkoutLog {
  const rows = cardioRows(log);
  if (rows.length === 0) return log;

  const seenPerExercise = new Map<string, number>();
  let changed = false;
  const cardioExercises = rows.map((row) => {
    if (row.cardioInstanceId) return row;
    changed = true;
    const index = seenPerExercise.get(row.exerciseId) ?? 0;
    seenPerExercise.set(row.exerciseId, index + 1);
    const suffix =
      index === 0 &&
      rows.filter((r) => r.exerciseId === row.exerciseId).length === 1
        ? ""
        : `-${index + 1}`;
    return {
      ...row,
      cardioInstanceId: `${row.exerciseId}${suffix}-${createCardioInstanceId().slice(0, 8)}`,
    };
  });

  if (!changed) return log;
  return { ...log, cardioExercises };
}

export function buildNewCardioRow(
  exerciseId: string,
  patch?: Partial<ExerciseLog>,
): ExerciseLog {
  return {
    exerciseId,
    cardioInstanceId: createCardioInstanceId(),
    completed: false,
    skipped: false,
    loggingMode: "timer",
    ...patch,
  };
}

export function appendCardioKind(
  log: WorkoutLog,
  kind: CardioActivityKind,
): WorkoutLog {
  const exerciseId = CARDIO_KIND_TO_EXERCISE_ID[kind];
  return {
    ...log,
    cardioExercises: [
      ...cardioRows(log),
      buildNewCardioRow(exerciseId, {
        targetPrescription: defaultPrescriptionForKind(kind),
      }),
    ],
  };
}

function defaultPrescriptionForKind(kind: CardioActivityKind): string {
  const defaults: Record<CardioActivityKind, string> = {
    jog: "20 min",
    walk: "30 min",
    cycle: "30 min",
    hike: "45 min",
    swim: "20 min",
  };
  return defaults[kind];
}

function formatQuickCardioPrescription(input: {
  distanceMi?: number;
  durationSeconds?: number;
}): string {
  const parts: string[] = [];
  if (input.distanceMi != null && input.distanceMi > 0) {
    parts.push(`${input.distanceMi} mi`);
  }
  if (input.durationSeconds != null && input.durationSeconds > 0) {
    const m = Math.floor(input.durationSeconds / 60);
    const s = input.durationSeconds % 60;
    parts.push(s > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${m} min`);
  }
  return parts.join(" · ") || "Logged";
}

export function buildCompletedQuickCardioRow(
  kind: CardioActivityKind,
  input: {
    distanceMi?: number;
    durationSeconds?: number;
    health?: CardioHealthMeta;
  },
): ExerciseLog {
  const exerciseId = CARDIO_KIND_TO_EXERCISE_ID[kind];
  return buildNewCardioRow(exerciseId, {
    completed: true,
    skipped: false,
    actualDistanceMi: input.distanceMi,
    actualDuration: input.durationSeconds,
    targetPrescription: formatQuickCardioPrescription(input),
    loggingMode: "timer",
    ...applyCardioHealthMeta(input.health),
  });
}

export function appendCardioRow(log: WorkoutLog, row: ExerciseLog): WorkoutLog {
  return {
    ...log,
    cardioExercises: [...cardioRows(log), row],
  };
}

export function cardioLabelForRow(
  row: ExerciseLog,
  allRows: ExerciseLog[],
): string {
  const same = allRows.filter((r) => r.exerciseId === row.exerciseId);
  const base = exerciseMap[row.exerciseId]?.name ?? row.exerciseId;
  if (same.length <= 1) return base;
  const index = same.findIndex((r) => cardioRowKey(r) === cardioRowKey(row)) + 1;
  return `${base} (${index})`;
}
