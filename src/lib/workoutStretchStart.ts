import {
  resolveStretchesForDay,
  type ResolvedDayStretches,
} from "@/lib/dayStretchPlan";
import {
  stretchesForPlanInWeek,
  type StretchResolveContext,
} from "@/lib/stretchResolveContext";
import type { AuthMode } from "@/stores/useAuthStore";
import type { DayPlan } from "@/types";
import type { TrainingWeekDays } from "@/lib/repos";
import { getWeekDateKeys, weekKeyFromDateKey } from "@/utils/weekCalendar";

export type LoadTrainingWeekForStretches = (
  weekAnchorDateKey: string,
  mode: AuthMode,
) => Promise<TrainingWeekDays | null | undefined>;

/** Week-aware resolve for workout start (loads week containing `weekAnchorDateKey` when set). */
export async function resolveStretchesForWorkoutStart(
  plan: DayPlan,
  ctx: StretchResolveContext,
  options?: {
    weekAnchorDateKey?: string;
    authMode?: AuthMode;
    loadWeek?: LoadTrainingWeekForStretches;
  },
): Promise<ResolvedDayStretches> {
  const anchor =
    (options?.weekAnchorDateKey
      ? weekKeyFromDateKey(options.weekAnchorDateKey)
      : null) ?? getWeekDateKeys()[0]!;
  const mode = options?.authMode ?? "guest";
  const loadWeek = options?.loadWeek;
  if (mode === "loading" || !loadWeek) return resolveStretchesForDay(plan, ctx);
  try {
    const week = await loadWeek(anchor, mode);
    if (week) return stretchesForPlanInWeek(plan, week, ctx);
  } catch {
    /* fall through */
  }
  return resolveStretchesForDay(plan, ctx);
}
