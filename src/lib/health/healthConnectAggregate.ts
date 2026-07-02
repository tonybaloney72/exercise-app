import { Capacitor, registerPlugin } from "@capacitor/core";
import type { HealthDataType } from "@capgo/capacitor-health";

type HealthConnectRangeMetric = "steps" | "calories" | "totalCalories";

type HealthConnectAggregatePlugin = {
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

/** Android-only: HC AggregateRequest for one deduped total over the window. */
export async function queryHealthConnectRangeTotal(options: {
  dataType: HealthDataType;
  startDate: string;
  endDate: string;
}): Promise<number | undefined> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return undefined;
  }

  const metric = toRangeMetric(options.dataType);
  if (!metric) return undefined;

  try {
    const { value } = await HealthConnectAggregate.queryRangeTotal({
      dataType: metric,
      startDate: options.startDate,
      endDate: options.endDate,
    });
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.round(value);
  } catch {
    return undefined;
  }
}
