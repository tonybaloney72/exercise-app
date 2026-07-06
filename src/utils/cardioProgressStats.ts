import { exerciseMap } from "@/core/catalog";
import { cardioLabelForRow, cardioRowKey } from "@/lib/cardioInstances";
import { computeCardioPaceMetrics } from "@/lib/health/cardioPaceMetrics";
import { resolveWorkoutCardioExercises } from "@/lib/resolveWorkoutCardio";
import type { CardioActivitySource, ExerciseLog, WorkoutLog } from "@/types";
import type { GpsTrackPoint } from "@/lib/geo/gpsTrackSession";
import {
  buildChartSessionAxis,
  formatLocalDateKey,
  parseLocalDateKey,
  sortByChartSortKey,
} from "@/utils/localDateKey";
import { positiveNumber } from "@/utils/optionalNumber";
import { formatLoggedDuration } from "@/utils/time";

export interface CardioChartPoint {
  date: string;
  xLabel: string;
  sortKey: number;
  /** 1-based index when multiple sessions were logged on the same day. */
  sessionIndex?: number;
  distanceMi?: number;
  durationSec?: number;
  durationMin?: number;
  paceSecondsPerMile?: number;
  speedMph?: number;
  /** Health Connect metrics for this session window. */
  stepCount?: number;
  activeCaloriesKcal?: number;
  avgHeartRateBpm?: number;
}

export type CardioSessionRow = CardioChartPoint & {
  /** Stable id for list selection (`workoutId:cardioRowKey`). */
  sessionKey: string;
  workoutLogId: string;
  /** e.g. Walk or Walk (2) when multiple sessions share a day. */
  label: string;
  gpsTrackPoints?: GpsTrackPoint[];
  activitySource?: CardioActivitySource;
  healthSourceName?: string;
  activityStartTime?: string;
  activityEndTime?: string;
  notes?: string;
};

export type CardioSessionDayGroup = {
  date: string;
  dayLabel: string;
  sessions: CardioSessionRow[];
};

const CARDIO_SOURCE_LABELS: Record<CardioActivitySource, string> = {
  manual: "Manual",
  gps: "GPS",
  health_connect: "Health Connect",
};

function cardioMetricsFromEntry(entry: ExerciseLog) {
  const dist = entry.actualDistanceMi;
  const dur = entry.actualDuration;
  const steps = positiveNumber(entry.stepCount);
  const kcal = positiveNumber(entry.activeCaloriesKcal);
  const hr = positiveNumber(entry.avgHeartRateBpm);
  if (dist == null && dur == null) return null;

  let pace: number | undefined;
  let speedMph: number | undefined;
  if (dist != null && dist > 0 && dur != null && dur > 0) {
    pace = dur / dist;
    speedMph = computeCardioPaceMetrics(dist, dur)?.avgSpeedMph;
  }

  return {
    distanceMi: dist ?? undefined,
    durationSec: dur ?? undefined,
    durationMin: dur != null ? dur / 60 : undefined,
    paceSecondsPerMile: pace,
    speedMph,
    stepCount: steps,
    activeCaloriesKcal: kcal,
    avgHeartRateBpm: hr,
  };
}

function collectCompletedCardioSessions(
  history: WorkoutLog[],
  exerciseId: string,
): CardioSessionRow[] {
  const rows: CardioSessionRow[] = [];

  for (const workout of history) {
    const allCardio = resolveWorkoutCardioExercises(workout);
    const entries = allCardio.filter(
      (row) =>
        row.exerciseId === exerciseId && row.completed && !row.skipped,
    );

    entries.forEach((entry, index) => {
      const metrics = cardioMetricsFromEntry(entry);
      if (!metrics) return;

      const sessionIndex = index + 1;
      rows.push({
        date: workout.date,
        workoutLogId: workout.id,
        sessionKey: `${workout.id}:${cardioRowKey(entry)}`,
        label: cardioLabelForRow(entry, allCardio),
        ...buildChartSessionAxis(workout.date, sessionIndex),
        ...metrics,
        gpsTrackPoints: entry.gpsTrackPoints,
        activitySource: entry.activitySource,
        healthSourceName: entry.healthSourceName,
        activityStartTime: entry.activityStartTime,
        activityEndTime: entry.activityEndTime,
        notes: entry.notes,
      });
    });
  }

  return sortByChartSortKey(rows);
}

/** Completed sessions for one endurance exercise with distance and/or duration. */
export function buildCardioChartSeries(
  history: WorkoutLog[],
  exerciseId: string,
): CardioChartPoint[] {
  return collectCompletedCardioSessions(history, exerciseId);
}

/** Full session rows for history lists and detail sheets. */
export function buildCardioSessionRows(
  history: WorkoutLog[],
  exerciseId: string,
): CardioSessionRow[] {
  return collectCompletedCardioSessions(history, exerciseId);
}

export function formatCardioHistoryDayLabel(
  dateKey: string,
  now: Date = new Date(),
): string {
  if (dateKey === formatLocalDateKey(now)) return "Today";
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) return dateKey;
  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** One-line summary for a session row (distance · duration · calories). */
export function formatCardioSessionQuickSummary(row: CardioSessionRow): string {
  const parts: string[] = [];
  if (row.distanceMi != null && row.distanceMi > 0) {
    parts.push(`${row.distanceMi} mi`);
  }
  if (row.durationSec != null && row.durationSec > 0) {
    parts.push(formatLoggedDuration(row.durationSec));
  }
  if (row.activeCaloriesKcal != null && row.activeCaloriesKcal > 0) {
    parts.push(`${Math.round(row.activeCaloriesKcal)} kcal`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Logged";
}

export type CardioSessionDetailMetric = {
  label: string;
  value: string;
};

export function buildCardioSessionDetailMetrics(
  row: CardioSessionRow,
): CardioSessionDetailMetric[] {
  const metrics: CardioSessionDetailMetric[] = [];

  if (row.distanceMi != null && row.distanceMi > 0) {
    metrics.push({ label: "Distance", value: `${row.distanceMi} mi` });
  }
  if (row.durationSec != null && row.durationSec > 0) {
    metrics.push({
      label: "Duration",
      value: formatLoggedDuration(row.durationSec),
    });
  }
  if (row.activeCaloriesKcal != null && row.activeCaloriesKcal > 0) {
    metrics.push({
      label: "Calories",
      value: `${Math.round(row.activeCaloriesKcal)} active kcal`,
    });
  }
  if (row.stepCount != null && row.stepCount > 0) {
    metrics.push({
      label: "Steps",
      value: row.stepCount.toLocaleString(),
    });
  }
  if (row.speedMph != null && row.speedMph > 0) {
    metrics.push({
      label: "Avg speed",
      value: formatSpeedMph(row.speedMph),
    });
  }
  if (row.paceSecondsPerMile != null && row.paceSecondsPerMile > 0) {
    metrics.push({
      label: "Pace",
      value: formatPacePerMile(row.paceSecondsPerMile),
    });
  }
  if (row.avgHeartRateBpm != null && row.avgHeartRateBpm > 0) {
    metrics.push({
      label: "Avg heart rate",
      value: `${Math.round(row.avgHeartRateBpm)} bpm`,
    });
  }
  if (row.activitySource) {
    metrics.push({
      label: "Source",
      value: CARDIO_SOURCE_LABELS[row.activitySource],
    });
  }
  if (row.healthSourceName?.trim()) {
    metrics.push({
      label: "Recorded by",
      value: row.healthSourceName.trim(),
    });
  }

  const timeRange = formatCardioActivityTimeRange(
    row.activityStartTime,
    row.activityEndTime,
  );
  if (timeRange) {
    metrics.push({ label: "Activity time", value: timeRange });
  }

  return metrics;
}

function formatCardioActivityTimeRange(
  start?: string,
  end?: string,
): string | undefined {
  if (!start && !end) return undefined;
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return start ? fmt(start) : end ? fmt(end) : undefined;
}

/** Group sessions by workout date, newest days first. */
export function groupCardioSessionsByDay(
  rows: CardioSessionRow[],
): CardioSessionDayGroup[] {
  const byDate = new Map<string, CardioSessionRow[]>();

  for (const row of rows) {
    const bucket = byDate.get(row.date) ?? [];
    bucket.push(row);
    byDate.set(row.date, bucket);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, sessions]) => ({
      date,
      dayLabel: formatCardioHistoryDayLabel(date),
      sessions: [...sessions].sort((a, b) => a.sortKey - b.sortKey),
    }));
}

export function cardioExerciseTitle(exerciseId: string): string {
  return exerciseMap[exerciseId]?.name ?? exerciseId;
}

/** e.g. `10:33/mi` */
export function formatPacePerMile(
  secondsPerMile: number | null | undefined,
): string {
  if (
    secondsPerMile == null ||
    !Number.isFinite(secondsPerMile) ||
    secondsPerMile <= 0
  ) {
    return "-";
  }
  const rounded = Math.round(secondsPerMile);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}/mi`;
}

/** e.g. `6 mph` */
export function formatSpeedMph(mph: number | null | undefined): string {
  if (mph == null || !Number.isFinite(mph) || mph <= 0) {
    return "-";
  }
  return `${mph} mph`;
}
