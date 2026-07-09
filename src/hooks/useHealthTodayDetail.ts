"use client";

import { useEffect, useMemo, useState } from "react";
import { queryNativeDayRecords } from "@/lib/health/nativeHealth";
import type { HealthDayRecord } from "@/lib/health/healthConnectTypes";
import {
  buildHealthRecordLogEntries,
  buildHourlyHealthSeries,
  healthTodayAggregationForSlug,
  healthTodayRecordTypeForSlug,
  hourlySeriesHasData,
} from "@/lib/health/healthTodayDetail";
import type { HealthStatSlug } from "@/lib/health/healthStatRoutes";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { formatLocalDateKey } from "@/utils/localDateKey";

export function useHealthTodayDetail(slug: HealthStatSlug) {
  const [records, setRecords] = useState<HealthDayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [nativeAvailable, setNativeAvailable] = useState(false);

  const recordType = healthTodayRecordTypeForSlug(slug);
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
          setLoading(false);
        }
        return;
      }

      const rows = await queryNativeDayRecords({
        dateKey: todayKey,
        isToday: true,
        recordType,
      });
      if (cancelled) return;
      setNativeAvailable(true);
      setRecords(rows);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [recordType, todayKey]);

  const hourlySeries = useMemo(() => {
    if (!recordType) return [];
    return buildHourlyHealthSeries(records, {
      aggregation: healthTodayAggregationForSlug(slug),
      slug,
    });
  }, [records, recordType, slug]);

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
  };
}
