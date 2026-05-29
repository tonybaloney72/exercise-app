import { regenDayIndicesForPrefsChange } from "@/lib/trainingWeekRegen";
import type { PrescribedPlanFreezeState } from "@/lib/workoutSessionGuard";
import { isPrescribedPlanFrozenFromState } from "@/lib/workoutSessionGuard";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { getWeekDateKeys } from "@/utils/weekCalendar";

/**
 * Whether a weekday (0–6) should be regenerated when the week blueprint or
 * program prefs change. Past days in the current Sun–Sat week are kept;
 * today is included only if the workout has not started.
 */
export function shouldRegenDayOfWeek(
  dayOfWeek: number,
  todayDayOfWeek: number,
  freezeTodayPlan: boolean,
): boolean {
  const indices = regenDayIndicesForPrefsChange({
    todayDayOfWeek,
    freezeTodayPlan,
  });
  return indices.includes(dayOfWeek);
}

/** Calendar date keys (YYYY-MM-DD) to regenerate for the current week. */
export function regenDateKeysForWeekChange(
  todayDateKey: string = formatLocalDateKey(),
  freezeState?: PrescribedPlanFreezeState,
): string[] {
  const weekKeys = getWeekDateKeys(new Date(todayDateKey + "T12:00:00"));
  const todayDow = new Date(todayDateKey + "T12:00:00").getDay();
  const freezeToday =
    freezeState != null
      ? isPrescribedPlanFrozenFromState(todayDateKey, freezeState)
      : false;

  const indices = regenDayIndicesForPrefsChange({
    todayDayOfWeek: todayDow,
    freezeTodayPlan: freezeToday,
  });

  return indices
    .map((dow) => weekKeys[dow])
    .filter((key): key is string => typeof key === "string");
}

export { regenDayIndicesForPrefsChange };
