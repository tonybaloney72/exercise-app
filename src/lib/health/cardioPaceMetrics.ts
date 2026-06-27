export type CardioPaceMetrics = {
  avgSpeedMph: number;
  paceLabel: string;
};

export function computeCardioPaceMetrics(
  distanceMi?: number,
  durationSeconds?: number,
): CardioPaceMetrics | undefined {
  if (
    distanceMi == null ||
    distanceMi <= 0 ||
    durationSeconds == null ||
    durationSeconds <= 0
  ) {
    return undefined;
  }

  const hours = durationSeconds / 3600;
  const avgSpeedMph = Math.round((distanceMi / hours) * 10) / 10;
  const minPerMi = durationSeconds / 60 / distanceMi;
  const paceMin = Math.floor(minPerMi);
  const paceSec = Math.min(59, Math.round((minPerMi - paceMin) * 60));
  const paceLabel = `${paceMin}:${String(paceSec).padStart(2, "0")}/mi`;

  return { avgSpeedMph, paceLabel };
}

export function formatCardioPaceSummary(
  distanceMi?: number,
  durationSeconds?: number,
): string | undefined {
  const metrics = computeCardioPaceMetrics(distanceMi, durationSeconds);
  if (!metrics) return undefined;
  return `${metrics.paceLabel} · ${metrics.avgSpeedMph} mph`;
}

/** Average speed in m/s when distance and duration are both known. */
export function computeCardioSpeedMetersPerSecond(
  distanceMi?: number,
  durationSeconds?: number,
): number | undefined {
  if (
    distanceMi == null ||
    distanceMi <= 0 ||
    durationSeconds == null ||
    durationSeconds <= 0
  ) {
    return undefined;
  }
  return (distanceMi * 1609.344) / durationSeconds;
}
