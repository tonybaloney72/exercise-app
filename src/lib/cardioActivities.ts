import { TRAINING_WEEK_CATALOG } from "@/data/trainingWeekCatalog";
import { exerciseMatchesEquipment } from "@/data/equipment";
import { buildNewCardioRow } from "@/lib/cardioInstances";
import {
  CARDIO_ACTIVITY_EMOJI,
  CARDIO_ACTIVITY_LABELS,
  CARDIO_ACTIVITY_ORDER,
  CARDIO_KIND_TO_EXERCISE_ID,
} from "@/lib/cardioKinds";
import type {
  CardioActivity,
  CardioActivityKind,
  DayPlan,
  ExerciseEquipment,
  ExerciseLog,
} from "@/types";

export {
  CARDIO_ACTIVITY_EMOJI,
  CARDIO_ACTIVITY_LABELS,
  CARDIO_ACTIVITY_ORDER,
  CARDIO_KIND_TO_EXERCISE_ID,
} from "@/lib/cardioKinds";

const KIND_EQUIPMENT: Record<CardioActivityKind, ExerciseEquipment[]> = {
  jog: ["bodyweight"],
  walk: ["bodyweight"],
  hike: ["bodyweight"],
  swim: ["bodyweight"],
  cycle: ["bicycle"],
  treadmill: ["treadmill"],
  elliptical: ["elliptical"],
  indoor_bike: ["indoor_bike"],
  row: ["rowing_machine"],
  stairs: ["stair_climber"],
};

export function cardioKindAllowed(
  kind: CardioActivityKind,
  availableEquipment: ExerciseEquipment[],
): boolean {
  const required = KIND_EQUIPMENT[kind];
  return required.every((eq) => availableEquipment.includes(eq));
}

function activityForKind(kind: CardioActivityKind): CardioActivity {
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
  if (plan.cardioActivities != null) {
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

function weeklyCardioFingerprint(
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
  return activities.map((a) =>
    buildNewCardioRow(a.exerciseId, {
      completed: false,
      skipped: false,
      targetPrescription: a.defaultPrescription ?? "20 min",
      loggingMode: "timer",
    }),
  );
}

