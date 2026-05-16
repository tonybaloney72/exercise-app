import { getPlanForDay } from "@/data/dailyPlans";
import { getTrainingWeekRepo } from "@/lib/repos";
import type { AuthMode } from "@/stores/useAuthStore";
import type { DayPlan } from "@/types";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { getSundayOfWeekContaining, parseLocalDateKey } from "@/utils/weekCalendar";

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
  const repo = getTrainingWeekRepo("authenticated");
  let days = await repo.loadWeek(weekKey);
  if (!days) {
    const seeded: Record<number, DayPlan> = {};
    for (let i = 0; i < 7; i++) {
      seeded[i] = getPlanForDay(i);
    }
    await repo.saveSeededWeek(weekKey, seeded);
    days = await repo.loadWeek(weekKey);
  }
  const plan = days?.[dow];
  if (plan) return plan;
  return getPlanForDay(dow);
}
