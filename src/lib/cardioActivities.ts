import { TRAINING_WEEK_CATALOG } from "@/data/trainingWeekCatalog";
import { exerciseMatchesEquipment } from "@/data/equipment";
import type {
  CardioActivity,
  CardioActivityKind,
  DayPlan,
  ExerciseEquipment,
  ExerciseLog,
} from "@/types";

export const CARDIO_ACTIVITY_ORDER: CardioActivityKind[] = [
  "jog",
  "walk",
  "cycle",
  "hike",
  "swim",
];

export const CARDIO_KIND_TO_EXERCISE_ID: Record<CardioActivityKind, string> = {
  jog: "END-JOG",
  walk: "END-WALK",
  cycle: "END-CYCLE",
  hike: "END-HIKE",
  swim: "END-SWIM",
};

export const CARDIO_ACTIVITY_LABELS: Record<CardioActivityKind, string> = {
  jog: "Jog",
  walk: "Walk",
  cycle: "Cycle",
  hike: "Hike",
  swim: "Swim",
};

export const CARDIO_ACTIVITY_EMOJI: Record<CardioActivityKind, string> = {
  jog: "🏃",
  walk: "🚶",
  cycle: "🚴",
  hike: "🥾",
  swim: "🏊",
};

const KIND_EQUIPMENT: Record<CardioActivityKind, ExerciseEquipment[]> = {
  jog: ["bodyweight"],
  walk: ["bodyweight"],
  hike: ["bodyweight"],
  swim: ["bodyweight"],
  cycle: ["bicycle"],
};

export function cardioKindAllowed(
  kind: CardioActivityKind,
  availableEquipment: ExerciseEquipment[],
): boolean {
  const required = KIND_EQUIPMENT[kind];
  return required.every((eq) => availableEquipment.includes(eq));
}

export function activityForKind(kind: CardioActivityKind): CardioActivity {
  return {
    kind,
    exerciseId: CARDIO_KIND_TO_EXERCISE_ID[kind],
  };
}

export function kindsToActivities(
  kinds: CardioActivityKind[],
  availableEquipment: ExerciseEquipment[],
): CardioActivity[] {
  const out: CardioActivity[] = [];
  for (const kind of CARDIO_ACTIVITY_ORDER) {
    if (!kinds.includes(kind)) continue;
    if (!cardioKindAllowed(kind, availableEquipment)) continue;
    out.push(activityForKind(kind));
  }
  return out;
}

/** Catalog seed: jog on Mon–Sat. */
export function suggestWeeklyCardioFromCatalog(): Record<number, CardioActivityKind[]> {
  const out: Record<number, CardioActivityKind[]> = {};
  for (const plan of TRAINING_WEEK_CATALOG) {
    out[plan.dayOfWeek] = plan.hasJog ? ["jog"] : [];
  }
  return out;
}

export function planHasJog(plan: DayPlan): boolean {
  if (plan.cardioActivities?.some((a) => a.kind === "jog")) return true;
  return plan.hasJog;
}

export function resolveCardioActivities(plan: DayPlan): CardioActivity[] {
  if (plan.cardioActivities && plan.cardioActivities.length > 0) {
    return plan.cardioActivities;
  }
  if (plan.hasJog) {
    return [activityForKind("jog")];
  }
  return [];
}

/** Keep legacy `hasJog` in sync for persisted JSON and badges. */
export function normalizeDayPlanCardio(plan: DayPlan): DayPlan {
  const cardioActivities = resolveCardioActivities(plan);
  return {
    ...plan,
    cardioActivities,
    hasJog: cardioActivities.some((a) => a.kind === "jog"),
  };
}

export function weeklyCardioFingerprint(
  byDay: Record<number, CardioActivityKind[]>,
): string {
  const seg = [0, 1, 2, 3, 4, 5, 6]
    .map((dow) => {
      const kinds = byDay[dow] ?? [];
      return `${dow}:${kinds.join("+") || "-"}`;
    })
    .join("|");
  return `wc:${seg}`;
}

export function sanitizeWeeklyCardioByDay(
  raw: unknown,
  fallback: Record<number, CardioActivityKind[]> = suggestWeeklyCardioFromCatalog(),
): Record<number, CardioActivityKind[]> {
  if (!raw || typeof raw !== "object") {
    return { ...fallback };
  }
  const allowed = new Set(CARDIO_ACTIVITY_ORDER);
  const out: Record<number, CardioActivityKind[]> = {};
  for (let dow = 0; dow < 7; dow++) {
    const dayRaw = (raw as Record<string, unknown>)[String(dow)];
    if (!Array.isArray(dayRaw)) {
      out[dow] = [...(fallback[dow] ?? [])];
      continue;
    }
    const kinds: CardioActivityKind[] = [];
    for (const item of dayRaw) {
      if (typeof item === "string" && allowed.has(item as CardioActivityKind)) {
        kinds.push(item as CardioActivityKind);
      }
    }
    out[dow] = kinds;
  }
  return out;
}

export function weeklyCardioEqual(
  a: Record<number, CardioActivityKind[]>,
  b: Record<number, CardioActivityKind[]>,
): boolean {
  return weeklyCardioFingerprint(a) === weeklyCardioFingerprint(b);
}

export function applyWeeklyCardioToDay(
  plan: DayPlan,
  kinds: CardioActivityKind[],
  availableEquipment: ExerciseEquipment[],
): DayPlan {
  return normalizeDayPlanCardio({
    ...plan,
    cardioActivities: kindsToActivities(kinds, availableEquipment),
  });
}

export function buildEmptyCardioLogs(activities: CardioActivity[]): ExerciseLog[] {
  return activities.map((a) => ({
    exerciseId: a.exerciseId,
    completed: false,
    skipped: false,
    targetPrescription: a.defaultPrescription ?? "20 min",
    loggingMode: "timer",
  }));
}

/** Mirror first jog row into legacy workout_log jog columns (Phase 3 removes this). */
export function syncLegacyJogFieldsFromCardioLogs(log: {
  cardioExercises?: ExerciseLog[];
  jogCompleted: boolean;
  jogSkipped: boolean;
  jogDistance?: number;
  jogDurationSeconds?: number;
}): void {
  const jogId = CARDIO_KIND_TO_EXERCISE_ID.jog;
  const jog = log.cardioExercises?.find((e) => e.exerciseId === jogId);
  if (!jog) return;
  log.jogCompleted = jog.completed;
  log.jogSkipped = jog.skipped;
  log.jogDistance = jog.actualDistanceMi;
  log.jogDurationSeconds = jog.actualDuration;
}

export function syncJogCardioLogFromLegacy(log: {
  cardioExercises?: ExerciseLog[];
  jogCompleted: boolean;
  jogSkipped: boolean;
  jogDistance?: number;
  jogDurationSeconds?: number;
}): ExerciseLog[] {
  const jogId = CARDIO_KIND_TO_EXERCISE_ID.jog;
  const list = [...(log.cardioExercises ?? [])];
  const idx = list.findIndex((e) => e.exerciseId === jogId);
  if (idx < 0) return list;
  list[idx] = {
    ...list[idx]!,
    completed: log.jogCompleted,
    skipped: log.jogSkipped,
    actualDistanceMi: log.jogDistance,
    actualDuration: log.jogDurationSeconds,
  };
  return list;
}
