"use client";

import { useState } from "react";
import { exerciseMap } from "@/core/catalog";
import { formatSecondsToMMSS, parseTimeInput } from "@/utils/time";
import WorkoutCompletionCheckbox from "@/components/workout/WorkoutCompletionCheckbox";
import CardioActivityLogFields, {
  applyResolvedCardioQuickLog,
} from "@/components/workout/CardioActivityLogFields";
import WorkoutRowMetaLine from "./WorkoutRowMetaLine";
import type { WorkoutRowMenuItem } from "./WorkoutRowOverflowMenu";
import {
  MenuIconRemove,
  MenuIconSkip,
  MenuIconUndoSkip,
} from "./WorkoutRowMenuIcons";
import { formatCardioHealthSummary, type CardioHealthMeta } from "@/lib/health";
import type { ResolvedCardioQuickLog } from "@/lib/health/resolveCardioQuickLog";
import type { GpsTrackPoint } from "@/lib/geo/gpsTrackSession";
import { mirrorCardioCaptureToHealth } from "@/lib/mirrorCardioToHealth";
import { getWeightForDate } from "@/lib/weightLog";
import type { CardioSessionCaptureInput } from "@/lib/cardioSessionLog";
import { useWeightStore } from "@/stores/useWeightStore";
import type { CardioActivityKind, ExerciseLog } from "@/types";

type Props = {
  log: ExerciseLog;
  kind?: CardioActivityKind;
  dateKey: string;
  onToggle: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  onSetDistance: (mi: number | undefined) => void;
  onSetDurationSeconds: (seconds: number | undefined) => void;
  onApplySessionCapture: (input: CardioSessionCaptureInput) => void;
  onRemove?: () => void;
};

export default function CardioSessionBlock({
  log,
  kind,
  dateKey,
  onToggle,
  onSkip,
  onUnskip,
  onSetDistance,
  onSetDurationSeconds,
  onApplySessionCapture,
  onRemove,
}: Props) {
  const weightEntries = useWeightStore((s) => s.entries);
  const [distanceInput, setDistanceInput] = useState(
    log.actualDistanceMi != null ? String(log.actualDistanceMi) : "",
  );
  const [timeInput, setTimeInput] = useState(
    formatSecondsToMMSS(log.actualDuration),
  );
  const [healthMeta, setHealthMeta] = useState<CardioHealthMeta | undefined>();
  const [activityWindow, setActivityWindow] = useState<{
    startDate: Date;
    endDate: Date;
  } | null>(null);
  const [resolution, setResolution] = useState<
    ResolvedCardioQuickLog["resolution"] | null
  >(null);
  const [gpsTrack, setGpsTrack] = useState<
    readonly GpsTrackPoint[] | undefined
  >();

  const meta = exerciseMap[log.exerciseId];
  const title = meta?.name ?? log.exerciseId;
  const done = log.completed || log.skipped;
  const healthSummary =
    formatCardioHealthSummary(healthMeta ?? log) ||
    formatCardioHealthSummary(log);

  const overflowItems: WorkoutRowMenuItem[] = [];
  if (!log.completed && !log.skipped) {
    overflowItems.push({
      label: "Skip",
      icon: <MenuIconSkip />,
      onClick: onSkip,
    });
  }
  if (log.skipped) {
    overflowItems.push({
      label: "Undo skip",
      icon: <MenuIconUndoSkip />,
      onClick: onUnskip,
    });
  }
  if (onRemove) {
    overflowItems.push({
      label: "Remove from workout",
      icon: <MenuIconRemove />,
      onClick: onRemove,
    });
  }

  function handleResolved(result: ResolvedCardioQuickLog) {
    applyResolvedCardioQuickLog({
      result,
      setDistanceInput,
      setTimeInput,
      setHealthMeta,
      setActivityWindow,
      setResolution,
      setGpsTrack,
    });

    const capture: CardioSessionCaptureInput = {
      distanceMi: result.distanceMi,
      durationSeconds: result.durationSeconds,
      health: result.health,
      gpsTrackPoints: result.gpsTrack,
      activityStartTime: result.startDate.toISOString(),
      activityEndTime: result.endDate.toISOString(),
    };
    onApplySessionCapture(capture);

    if (kind) {
      const weightLb = getWeightForDate(weightEntries, dateKey)?.weightLb;
      void mirrorCardioCaptureToHealth({
        kind,
        distanceMi: capture.distanceMi,
        durationSeconds: capture.durationSeconds,
        activeCaloriesKcal: result.health?.activeCaloriesKcal,
        activityStartTime: capture.activityStartTime,
        activityEndTime: capture.activityEndTime,
        weightLb,
      }).catch(() => {
        // Optional mirror to Health Connect.
      });
    }
  }

  return (
    <section
      className={`rounded-lg border border-border/70 bg-surface-hover/30 ${
        log.skipped ? "opacity-40" : ""
      }`}
    >
      <div className="px-1">
        <WorkoutRowMetaLine
          leading={
            <WorkoutCompletionCheckbox
              completed={log.completed}
              onClick={onToggle}
            />
          }
          name={title}
          nameClassName={
            done ? "text-muted line-through" : "text-foreground"
          }
          readOnly
          titleAlign="center"
          onNameClick={() => {}}
          menuItems={overflowItems}
          detailTrailing={<></>}
        />
      </div>

      {kind && !log.skipped ? (
        <div className="px-2 pb-3 md:px-3">
          <CardioActivityLogFields
            kind={kind}
            distanceInput={distanceInput}
            timeInput={timeInput}
            onDistanceInputChange={setDistanceInput}
            onTimeInputChange={setTimeInput}
            healthMeta={healthMeta}
            onResolved={handleResolved}
            compact
          />
        </div>
      ) : (
        <span className="flex gap-3 px-2 pb-3 md:px-3">
          <label className="flex-1 block">
            <span className="text-caption text-muted uppercase tracking-wider">
              Distance (mi)
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={distanceInput}
              onChange={(e) => setDistanceInput(e.target.value)}
              onBlur={() => {
                const val = distanceInput.trim();
                if (val === "") onSetDistance(undefined);
                else {
                  const num = parseFloat(val);
                  onSetDistance(Number.isNaN(num) ? undefined : num);
                }
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="1.3"
            />
          </label>
          <label className="flex-1 block">
            <span className="text-caption text-muted uppercase tracking-wider">
              Time (MM:SS)
            </span>
            <input
              type="text"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              onBlur={() => {
                const raw = timeInput.trim();
                if (raw === "") onSetDurationSeconds(undefined);
                else onSetDurationSeconds(parseTimeInput(raw));
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="9:30 or 930"
            />
          </label>
        </span>
      )}

      {healthSummary && !kind ? (
        <p className="px-2 pb-3 text-xs text-muted md:px-3">{healthSummary}</p>
      ) : null}
      {resolution && kind ? (
        <p className="px-3 pb-3 text-xs text-muted">
          Captured via {resolution.replaceAll("_", " ")}.
        </p>
      ) : null}
    </section>
  );
}
