import { formatLocalDateKey } from "@/utils/localDateKey";
import { weekKeyFromDateKey } from "@/utils/weekCalendar";

/**
 * Stable per-week seed for exercise picks (Slice 3).
 * Same week + scope → same ids; new calendar week → different rotation.
 */
export function buildVarietySeed(weekKey: string, scope: string): string {
  const wk = weekKey.trim() || "unknown-week";
  const sc = scope.trim() || "default";
  return `${wk}|${sc}`;
}

/** Current Sun–Sat week key + auth scope for in-memory materialization. */
export function varietySeedForCurrentWeek(scope: string): string {
  const today = formatLocalDateKey();
  const weekKey = weekKeyFromDateKey(today) ?? today;
  return buildVarietySeed(weekKey, scope);
}
