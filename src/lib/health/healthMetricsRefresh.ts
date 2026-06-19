/** Dispatched after pull-to-refresh so daily HC metrics reload immediately. */
export const HEALTH_METRICS_REFRESH_EVENT = "myexercise:refresh-health-metrics";

export function dispatchHealthMetricsRefresh(options?: { force?: boolean }): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(HEALTH_METRICS_REFRESH_EVENT, {
      detail: { force: options?.force ?? true },
    }),
  );
}
