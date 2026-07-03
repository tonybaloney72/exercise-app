"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CardioActivityRecorder from "@/components/workout/CardioActivityRecorder";
import CardioHealthImport from "@/components/workout/CardioHealthImport";
import {
  formatCardioHealthSummary,
  type CardioHealthMeta,
} from "@/lib/health";
import { formatCardioPaceSummary } from "@/lib/health/cardioPaceMetrics";
import type { ResolvedCardioQuickLog } from "@/lib/health/resolveCardioQuickLog";
import type { GpsTrackPoint } from "@/lib/geo/gpsTrackSession";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { formatSecondsToMMSS, parseTimeInput } from "@/utils/time";
import type { CardioActivityKind } from "@/types";

export type CardioActivityLogFieldsProps = {
  kind: CardioActivityKind;
  distanceInput: string;
  timeInput: string;
  onDistanceInputChange: (value: string) => void;
  onTimeInputChange: (value: string) => void;
  healthMeta?: CardioHealthMeta;
  onResolved: (result: ResolvedCardioQuickLog) => void;
  /** Start/End recorder (and GPS). Off when the row is already completed. */
  showRecorder?: boolean;
  showHealthImport?: boolean;
  compact?: boolean;
};

export function applyResolvedCardioQuickLog(input: {
  result: ResolvedCardioQuickLog;
  setDistanceInput: (value: string) => void;
  setTimeInput: (value: string) => void;
  setHealthMeta: (value: CardioHealthMeta | undefined) => void;
  setActivityWindow: (
    value: { startDate: Date; endDate: Date } | null,
  ) => void;
  setResolution: (value: ResolvedCardioQuickLog["resolution"] | null) => void;
  setGpsTrack: (value: readonly GpsTrackPoint[] | undefined) => void;
}): void {
  const { result } = input;
  if (result.distanceMi != null) {
    input.setDistanceInput(String(result.distanceMi));
  }
  input.setTimeInput(formatSecondsToMMSS(result.durationSeconds));
  input.setHealthMeta(result.health);
  input.setActivityWindow({
    startDate: result.startDate,
    endDate: result.endDate,
  });
  input.setResolution(result.resolution);
  input.setGpsTrack(result.gpsTrack);
}

export default function CardioActivityLogFields({
  kind,
  distanceInput,
  timeInput,
  onDistanceInputChange,
  onTimeInputChange,
  healthMeta,
  onResolved,
  showRecorder = true,
  showHealthImport = true,
  compact = false,
}: CardioActivityLogFieldsProps) {
  const [showEarlierImport, setShowEarlierImport] = useState(false);

  const healthPreview = formatCardioHealthSummary(healthMeta ?? {});
  const pacePreview = useMemo(() => {
    const distanceMi = distanceInput.trim()
      ? parseFloat(distanceInput.trim())
      : undefined;
    const durationSeconds = timeInput.trim()
      ? parseTimeInput(timeInput.trim())
      : undefined;
    if (
      distanceMi == null ||
      Number.isNaN(distanceMi) ||
      distanceMi <= 0 ||
      durationSeconds == null ||
      durationSeconds <= 0
    ) {
      return undefined;
    }
    return formatCardioPaceSummary(distanceMi, durationSeconds);
  }, [distanceInput, timeInput]);

  const fieldClass = compact
    ? "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
    : "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm";

  const showTrackingControls =
    showRecorder || (showHealthImport && isNativePlatform());

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {showTrackingControls ? (
          <motion.div
            key="cardio-tracking-controls"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex flex-col gap-3 overflow-hidden"
          >
            {showRecorder ? (
              <CardioActivityRecorder kind={kind} onResolved={onResolved} />
            ) : null}

            {showHealthImport && isNativePlatform() ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowEarlierImport((v) => !v)}
                  className="text-xs font-medium text-accent hover:underline text-left"
                >
                  {showEarlierImport
                    ? "Hide earlier Health Connect sessions"
                    : "Import an earlier session instead"}
                </button>
                {showEarlierImport ? (
                  <CardioHealthImport
                    kind={kind}
                    onImport={(session) => {
                      onResolved({
                        startDate: session.startDate,
                        endDate: session.endDate,
                        durationSeconds: session.durationSeconds,
                        distanceMi: session.distanceMi,
                        gpsTrack: session.gpsTrack,
                        health: {
                          stepCount: session.stepCount,
                          activeCaloriesKcal: session.activeCaloriesKcal,
                          avgHeartRateBpm: session.avgHeartRateBpm,
                          source: "health_connect",
                          healthSourceName: session.sourceName,
                        },
                        resolution: "health_connect_session",
                      });
                      setShowEarlierImport(false);
                    }}
                  />
                ) : null}
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <label className="block">
        <span className="text-caption text-muted uppercase tracking-wider">
          Distance (mi)
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={distanceInput}
          onChange={(e) => onDistanceInputChange(e.target.value)}
          placeholder="1.2"
          className={fieldClass}
        />
      </label>
      <label className="block">
        <span className="text-caption text-muted uppercase tracking-wider">
          Time (MM:SS)
        </span>
        <input
          type="text"
          value={timeInput}
          onChange={(e) => onTimeInputChange(e.target.value)}
          placeholder="9:30 or 930"
          className={fieldClass}
        />
      </label>
      {pacePreview ? (
        <p className="text-xs text-muted">Pace: {pacePreview}</p>
      ) : null}
      {healthPreview ? (
        <p className="text-xs text-muted">{healthPreview}</p>
      ) : null}
    </div>
  );
}
