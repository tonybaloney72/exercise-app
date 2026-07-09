import type { HealthConnectRangeMetric } from "@/lib/health/healthConnectTypes";
import type { HealthDataType } from "@/lib/health/healthConnectTypes";
import { HealthConnectNative } from "@/lib/health/healthConnectPlugin";
import { isAndroidNative } from "@/lib/capacitorRuntime";
import { clientTrace } from "@/lib/diagnostics/clientTrace";

function toRangeMetric(dataType: HealthDataType): HealthConnectRangeMetric | null {
  if (
    dataType === "steps" ||
    dataType === "calories" ||
    dataType === "totalCalories" ||
    dataType === "distance" ||
    dataType === "heartRate" ||
    dataType === "restingHeartRate" ||
    dataType === "oxygenSaturation"
  ) {
    return dataType;
  }
  return null;
}

/** Android: HC AggregateRequest total for a local calendar day (matches HC app). */
export async function queryHealthConnectLocalDayTotal(options: {
  dateKey: string;
  isToday: boolean;
  dataType: HealthDataType;
}): Promise<number | undefined> {
  if (!isAndroidNative()) return undefined;

  const metric = toRangeMetric(options.dataType);
  if (!metric) return undefined;

  try {
    const { value } = await HealthConnectNative.queryLocalDayTotal({
      dateKey: options.dateKey,
      isToday: options.isToday,
      dataType: metric,
    });
    if (!Number.isFinite(value)) return undefined;
    const normalized = Math.max(0, value);
    const rounded =
      metric === "oxygenSaturation" || metric === "restingHeartRate"
        ? Math.round(normalized * 10) / 10
        : Math.round(normalized);
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

/** Android: HC AggregateRequest for one deduped total over an ISO window. */
export async function queryHealthConnectRangeTotal(options: {
  dataType: HealthDataType;
  startDate: string;
  endDate: string;
}): Promise<number | undefined> {
  if (!isAndroidNative()) return undefined;

  const metric = toRangeMetric(options.dataType);
  if (!metric) return undefined;

  try {
    const { value } = await HealthConnectNative.queryRangeTotal({
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
