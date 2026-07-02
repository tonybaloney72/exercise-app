import { Capacitor, registerPlugin } from "@capacitor/core";
import type { HealthDataType } from "@capgo/capacitor-health";
import { clientTrace } from "@/lib/diagnostics/clientTrace";

type HealthConnectRangeMetric = "steps" | "calories" | "totalCalories";

type HealthConnectAggregatePlugin = {
  queryLocalDayTotal(options: {
    dateKey: string;
    isToday: boolean;
    dataType: HealthConnectRangeMetric;
  }): Promise<{ value: number }>;
  queryRangeTotal(options: {
    dataType: HealthConnectRangeMetric;
    startDate: string;
    endDate: string;
  }): Promise<{ value: number }>;
};

const HealthConnectAggregate = registerPlugin<HealthConnectAggregatePlugin>(
  "HealthConnectAggregate",
);

function toRangeMetric(dataType: HealthDataType): HealthConnectRangeMetric | null {
  if (dataType === "steps" || dataType === "calories" || dataType === "totalCalories") {
    return dataType;
  }
  return null;
}

function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

/** Android: HC total for a local calendar day (computed on device, matches HC app). */
export async function queryHealthConnectLocalDayTotal(options: {
  dateKey: string;
  isToday: boolean;
  dataType: HealthDataType;
}): Promise<number | undefined> {
  if (!isAndroidNative()) return undefined;

  const metric = toRangeMetric(options.dataType);
  if (!metric) return undefined;

  try {
    const { value } = await HealthConnectAggregate.queryLocalDayTotal({
      dateKey: options.dateKey,
      isToday: options.isToday,
      dataType: metric,
    });
    if (!Number.isFinite(value) || value < 0) return undefined;
    const rounded = Math.round(value);
    clientTrace("health-connect", "local_day_total", {
      dateKey: options.dateKey,
      isToday: options.isToday,
      dataType: metric,
      value: rounded,
    });
    return rounded;
  } catch (err) {
    clientTrace(
      "health-connect",
      "local_day_total_failed",
      {
        dateKey: options.dateKey,
        isToday: options.isToday,
        dataType: metric,
        message: err instanceof Error ? err.message : String(err),
      },
      "warn",
    );
    return undefined;
  }
}

/** Android-only: HC AggregateRequest for one deduped total over an ISO window. */
export async function queryHealthConnectRangeTotal(options: {
  dataType: HealthDataType;
  startDate: string;
  endDate: string;
}): Promise<number | undefined> {
  if (!isAndroidNative()) return undefined;

  const metric = toRangeMetric(options.dataType);
  if (!metric) return undefined;

  try {
    const { value } = await HealthConnectAggregate.queryRangeTotal({
      dataType: metric,
      startDate: options.startDate,
      endDate: options.endDate,
    });
    if (!Number.isFinite(value) || value < 0) return undefined;
    return Math.round(value);
  } catch (err) {
    clientTrace(
      "health-connect",
      "range_total_failed",
      {
        dataType: metric,
        message: err instanceof Error ? err.message : String(err),
      },
      "warn",
    );
    return undefined;
  }
}
