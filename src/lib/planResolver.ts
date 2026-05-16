import { getPlanForDay } from "@/data/dailyPlans";
import { getTrainingWeekRepo } from "@/lib/repos";
import type { TrainingWeekDays } from "@/lib/repos";
import type { AuthMode } from "@/stores/useAuthStore";
import type { DayPlan } from "@/types";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { getSundayOfWeekContaining, parseLocalDateKey } from "@/utils/weekCalendar";

function buildCatalogWeek(): TrainingWeekDays {
  const out: TrainingWeekDays = {};
  for (let i = 0; i < 7; i++) {
    out[i] = getPlanForDay(i);
  }
  return out;
}

/** Load persisted week or seed from catalog; merge so partial JSON never drops days. */
async function loadOrSeedPersistedWeek(
  weekStartSundayKey: string,
): Promise<TrainingWeekDays> {
  const repo = getTrainingWeekRepo("authenticated");
  let days = await repo.loadWeek(weekStartSundayKey);
  if (!days) {
    const seeded = buildCatalogWeek();
    await repo.saveSeededWeek(weekStartSundayKey, seeded);
    days = await repo.loadWeek(weekStartSundayKey);
  }
  const fallback = buildCatalogWeek();
  const merged: TrainingWeekDays = { ...fallback };
  if (days) {
    for (let i = 0; i < 7; i++) {
      if (days[i]) merged[i] = days[i];
    }
  }
  return merged;
}

/**
 * Full Sun–Sat `DayPlan` map (keys 0–6): guests use the static catalog; authenticated users
 * use the same lazy-seeded row as `/today` and `/weekly/day/[date]` (any `YYYY-MM-DD` in the week).
 */
export async function resolveTrainingWeekForAuth(
  anyDateKeyInWeek: string,
  mode: AuthMode,
): Promise<TrainingWeekDays> {
  const parsed = parseLocalDateKey(anyDateKeyInWeek);
  if (!parsed) {
    throw new Error("Invalid date key");
  }
  if (mode !== "authenticated") {
    return buildCatalogWeek();
  }
  const sun = getSundayOfWeekContaining(parsed);
  const weekKey = formatLocalDateKey(sun);
  return loadOrSeedPersistedWeek(weekKey);
}

/**
 * Resolves the `DayPlan` for a local calendar day: guests use catalog only;
 * authenticated users lazy-seed the current Sun–Sat week into `user_training_weeks`.
 */
export async function resolveDayPlanForAuth(
  dateKey: string,
  mode: AuthMode,
): Promise<DayPlan> {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) {
    throw new Error("Invalid date key");
  }
  const dow = parsed.getDay();

  if (mode !== "authenticated") {
    return getPlanForDay(dow);
  }

  const sun = getSundayOfWeekContaining(parsed);
  const weekKey = formatLocalDateKey(sun);
  const days = await loadOrSeedPersistedWeek(weekKey);
  return days[dow] ?? getPlanForDay(dow);
}
