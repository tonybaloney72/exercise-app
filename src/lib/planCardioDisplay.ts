import {
  CARDIO_ACTIVITY_EMOJI,
  CARDIO_ACTIVITY_LABELS,
  resolveCardioActivities,
} from "@/lib/cardioActivities";
import { REST_DAY_LABELS } from "@/lib/restDays";
import type { DayPlan } from "@/types";

export function cardioBadgesForPlan(plan: DayPlan): string[] {
  return resolveCardioActivities(plan).map(
    (a) => `${CARDIO_ACTIVITY_EMOJI[a.kind]} ${CARDIO_ACTIVITY_LABELS[a.kind]}`,
  );
}

export function restBadgeForPlan(plan: DayPlan): string | null {
  if (!plan.restDayMode || plan.restDayMode === "workout") return null;
  return REST_DAY_LABELS[plan.restDayMode] ?? null;
}
