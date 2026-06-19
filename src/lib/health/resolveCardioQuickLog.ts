import type {
  GpsTrackPoint,
  GpsTrackSnapshot,
} from "@/lib/geo/gpsTrackSession";
import type { CardioActivityKind } from "@/types";
import {
  fetchCardioHealthMetricsForWindow,
  queryWorkoutsOverlappingWindow,
  mapWorkoutToImportedSession,
  checkCardioHealthReadAccess,
  type CardioHealthMeta,
  type ImportedCardioSession,
} from "@/lib/health/cardioHealth";
import {
  pickBestCardioSession,
  rankCardioSessionsForWindow,
  type ScoredCardioSession,
} from "@/lib/health/cardioSessionMatch";
import { clientTrace } from "@/lib/diagnostics/clientTrace";

export type CardioQuickLogResolution =
  | "health_connect_session"
  | "health_connect_samples"
  | "gps"
  | "timer_only";

export type ResolvedCardioQuickLog = {
  distanceMi?: number;
  durationSeconds: number;
  startDate: Date;
  endDate: Date;
  health?: CardioHealthMeta;
  resolution: CardioQuickLogResolution;
  /** ME GPS route when Start/End tracking captured enough points. */
  gpsTrack?: readonly GpsTrackPoint[];
  /** When auto-pick is ambiguous, UI should ask the user to choose. */
  ambiguousSessions?: ScoredCardioSession[];
};

function durationSecondsBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 1000));
}

function gpsDistanceMi(snapshot?: GpsTrackSnapshot | null): number | undefined {
  if (!snapshot || snapshot.distanceMi <= 0 || snapshot.pointCount < 2) {
    return undefined;
  }
  return snapshot.distanceMi;
}

/** ME GPS wins when recorded; HC session/sample distance is fallback. */
function pickDistanceMi(options: {
  sessionDistanceMi?: number;
  sampleDistanceMi?: number;
  gpsMi?: number;
}): number | undefined {
  if (options.gpsMi != null && options.gpsMi > 0) {
    return options.gpsMi;
  }
  if (options.sessionDistanceMi != null && options.sessionDistanceMi > 0) {
    return options.sessionDistanceMi;
  }
  if (options.sampleDistanceMi != null && options.sampleDistanceMi > 0) {
    return options.sampleDistanceMi;
  }
  return undefined;
}

function enrichWithGpsTrack(
  result: ResolvedCardioQuickLog,
  gpsSnapshot?: GpsTrackSnapshot | null,
): ResolvedCardioQuickLog {
  const points = gpsSnapshot?.points;
  if (!points || points.length < 2) return result;

  const gpsMi = gpsDistanceMi(gpsSnapshot);
  const usedGpsDistance = gpsMi != null && result.distanceMi === gpsMi;

  return {
    ...result,
    gpsTrack: points,
    health: usedGpsDistance
      ? { ...result.health, source: "gps" as const }
      : result.health,
  };
}

async function resolveFromSession(
  kind: CardioActivityKind,
  startDate: Date,
  endDate: Date,
  session: ImportedCardioSession,
  gpsSnapshot?: GpsTrackSnapshot | null,
): Promise<ResolvedCardioQuickLog> {
  const windowMetrics = await fetchCardioHealthMetricsForWindow(
    session.startDate,
    session.endDate,
    {
      activeCaloriesKcal: session.activeCaloriesKcal,
      healthSourceName: session.sourceName,
    },
  );

  const gpsMi = gpsDistanceMi(gpsSnapshot);

  return enrichWithGpsTrack(
    {
      startDate,
      endDate,
      durationSeconds: durationSecondsBetween(startDate, endDate),
      distanceMi: pickDistanceMi({
        sessionDistanceMi: session.distanceMi,
        sampleDistanceMi: windowMetrics.distanceMi,
        gpsMi,
      }),
      health: {
        stepCount: windowMetrics.stepCount,
        activeCaloriesKcal:
          windowMetrics.activeCaloriesKcal ?? session.activeCaloriesKcal,
        avgHeartRateBpm: windowMetrics.avgHeartRateBpm,
        source: "health_connect",
        healthSourceName: session.sourceName ?? windowMetrics.healthSourceName,
      },
      resolution: "health_connect_session",
    },
    gpsSnapshot,
  );
}

async function resolveFromSamples(
  startDate: Date,
  endDate: Date,
  gpsSnapshot?: GpsTrackSnapshot | null,
): Promise<ResolvedCardioQuickLog> {
  const windowMetrics = await fetchCardioHealthMetricsForWindow(
    startDate,
    endDate,
  );
  const gpsMi = gpsDistanceMi(gpsSnapshot);

  return enrichWithGpsTrack(
    {
      startDate,
      endDate,
      durationSeconds: durationSecondsBetween(startDate, endDate),
      distanceMi: pickDistanceMi({
        sampleDistanceMi: windowMetrics.distanceMi,
        gpsMi,
      }),
      health: {
        ...windowMetrics,
        source: "health_connect",
      },
      resolution: "health_connect_samples",
    },
    gpsSnapshot,
  );
}

function resolveFromGps(
  startDate: Date,
  endDate: Date,
  gpsSnapshot: GpsTrackSnapshot,
): ResolvedCardioQuickLog {
  return enrichWithGpsTrack(
    {
      startDate,
      endDate,
      durationSeconds: durationSecondsBetween(startDate, endDate),
      distanceMi: gpsDistanceMi(gpsSnapshot),
      health: { source: "gps" },
      resolution: "gps",
    },
    gpsSnapshot,
  );
}

function resolveTimerOnly(startDate: Date, endDate: Date): ResolvedCardioQuickLog {
  return {
    startDate,
    endDate,
    durationSeconds: durationSecondsBetween(startDate, endDate),
    resolution: "timer_only",
  };
}

/** Resolve quick-log metrics after Start/End using HC sessions, samples, and GPS. */
export async function resolveCardioQuickLog(input: {
  kind: CardioActivityKind;
  startDate: Date;
  endDate: Date;
  gpsSnapshot?: GpsTrackSnapshot | null;
  /** Skip session matching and use HC samples in the user window. */
  preferSamples?: boolean;
}): Promise<ResolvedCardioQuickLog> {
  const { kind, startDate, endDate, gpsSnapshot, preferSamples } = input;
  const gpsMi = gpsDistanceMi(gpsSnapshot);

  clientTrace("cardio-resolve", "start", {
    kind,
    hasGps: gpsMi != null,
    gpsPointCount: gpsSnapshot?.pointCount ?? 0,
    preferSamples,
  });

  if (!(await checkCardioHealthReadAccess())) {
    clientTrace("cardio-resolve", "no_hc_access");
    if (gpsMi != null && gpsSnapshot) {
      return resolveFromGps(startDate, endDate, gpsSnapshot);
    }
    return resolveTimerOnly(startDate, endDate);
  }

  if (!preferSamples) {
    const workouts = await queryWorkoutsOverlappingWindow(startDate, endDate);
    const sessions = workouts
      .map(mapWorkoutToImportedSession)
      .filter((s) => s.durationSeconds > 0);

    const ranked = rankCardioSessionsForWindow({
      kind,
      userStartMs: startDate.getTime(),
      userEndMs: endDate.getTime(),
      sessions,
      gpsDistanceMi: gpsMi,
    });

    const autoPick = pickBestCardioSession(ranked);
    if (autoPick) {
      clientTrace("cardio-resolve", "session_auto", {
        score: autoPick.score,
        workoutType: autoPick.session.workoutType,
        distanceMi: autoPick.session.distanceMi,
        gpsDistanceMi: gpsMi,
      });
      return resolveFromSession(
        kind,
        startDate,
        endDate,
        autoPick.session,
        gpsSnapshot,
      );
    }

    if (ranked.length > 0) {
      clientTrace("cardio-resolve", "session_ambiguous", { count: ranked.length });
      return {
        ...resolveTimerOnly(startDate, endDate),
        ambiguousSessions: ranked.slice(0, 3),
      };
    }
  }

  const sampleMetrics = await fetchCardioHealthMetricsForWindow(
    startDate,
    endDate,
  );
  const hasSampleData =
    (sampleMetrics.distanceMi != null && sampleMetrics.distanceMi > 0) ||
    (sampleMetrics.stepCount != null && sampleMetrics.stepCount > 0) ||
    (sampleMetrics.activeCaloriesKcal != null &&
      sampleMetrics.activeCaloriesKcal > 0);

  if (hasSampleData) {
    clientTrace("cardio-resolve", "samples", {
      distanceMi: sampleMetrics.distanceMi,
      steps: sampleMetrics.stepCount,
      gpsDistanceMi: gpsMi,
    });
    return resolveFromSamples(startDate, endDate, gpsSnapshot);
  }

  if (gpsMi != null && gpsSnapshot) {
    clientTrace("cardio-resolve", "gps_only", { distanceMi: gpsMi });
    const base = resolveFromGps(startDate, endDate, gpsSnapshot);
    const enriched = await fetchCardioHealthMetricsForWindow(startDate, endDate);
    return enrichWithGpsTrack(
      {
        ...base,
        health: {
          ...enriched,
          source: "gps",
        },
      },
      gpsSnapshot,
    );
  }

  clientTrace("cardio-resolve", "timer_only");
  return resolveTimerOnly(startDate, endDate);
}

export async function resolveCardioQuickLogFromSession(input: {
  kind: CardioActivityKind;
  startDate: Date;
  endDate: Date;
  session: ImportedCardioSession;
  gpsSnapshot?: GpsTrackSnapshot | null;
}): Promise<ResolvedCardioQuickLog> {
  return resolveFromSession(
    input.kind,
    input.startDate,
    input.endDate,
    input.session,
    input.gpsSnapshot,
  );
}
