"use client";

import { useEffect, useMemo, useState } from "react";
import {
  queryNativeDayRecords,
  queryNativeHourlyTotals,
} from "@/lib/health/nativeHealth";
import type { HealthDayRecord } from "@/lib/health/healthConnectTypes";
import {
  buildHealthRecordLogEntries,
  buildHourlyHealthSeries,
  buildHourlySeriesFromTotals,
  healthTodayAggregationForSlug,
  healthTodayRecordTypeForSlug,
  healthTodayUsesHourlyAggregates,
  hourlySeriesHasData,
} from "@/lib/health/healthTodayDetail";
import type { HealthStatSlug } from "@/lib/health/healthStatRoutes";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { formatLocalDateKey } from "@/utils/localDateKey";

export function useHealthTodayDetail(slug: HealthStatSlug) {
  const [records, setRecords] = useState<HealthDayRecord[]>([]);
  const [hourlyTotals, setHourlyTotals] = useState<
    ReadonlyArray<{ hour: number; value: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [nativeAvailable, setNativeAvailable] = useState(false);

  const recordType = healthTodayRecordTypeForSlug(slug);
  const usesHourlyAggregates = healthTodayUsesHourlyAggregates(slug);
  const todayKey = formatLocalDateKey();

  useEffect(() => {
    if (!recordType) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      if (!isNativePlatform()) {
        if (!cancelled) {
          setNativeAvailable(false);
          setRecords([]);
          setHourlyTotals([]);
          setLoading(false);
        }
        return;
      }

      const [rows, totals] = await Promise.all([
        queryNativeDayRecords({
          dateKey: todayKey,
          isToday: true,
          recordType,
        }),
        usesHourlyAggregates
          ? queryNativeHourlyTotals({
              dateKey: todayKey,
              isToday: true,
              dataType: "steps",
            })
          : Promise.resolve([]),
      ]);
      if (cancelled) return;
      setNativeAvailable(true);
      setRecords(rows);
      setHourlyTotals(totals);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [recordType, todayKey, usesHourlyAggregates]);

  const hourlySeries = useMemo(() => {
    if (!recordType) return [];
    if (usesHourlyAggregates) {
      return buildHourlySeriesFromTotals(hourlyTotals);
    }
    return buildHourlyHealthSeries(records, {
      aggregation: healthTodayAggregationForSlug(slug),
      slug,
    });
  }, [hourlyTotals, records, recordType, slug, usesHourlyAggregates]);

  const logEntries = useMemo(
    () => buildHealthRecordLogEntries(records, slug),
    [records, slug],
  );

  return {
    loading,
    nativeAvailable,
    hourlySeries,
    logEntries,
    hasChartData: hourlySeriesHasData(hourlySeries),
    hasLogData: logEntries.length > 0,
    usesHourlyAggregates,
  };
}
