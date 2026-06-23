"use client";

import { useState } from "react";
import { exerciseMap } from "@/core/catalog";
import { parseTimeInput, formatSecondsToMMSS } from "@/utils/time";
import WorkoutRowOverflowMenu, {
  type WorkoutRowMenuItem,
} from "./WorkoutRowOverflowMenu";
import {
  MenuIconRemove,
  MenuIconSkip,
  MenuIconUndoSkip,
} from "./WorkoutRowMenuIcons";
import { formatCardioHealthSummary } from "@/lib/health";
import type { ExerciseLog } from "@/types";

type Props = {
  log: ExerciseLog;
  onToggle: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  onSetDistance: (mi: number | undefined) => void;
  onSetDurationSeconds: (seconds: number | undefined) => void;
  onRemove?: () => void;
};

export default function CardioSessionBlock({
  log,
  onToggle,
  onSkip,
  onUnskip,
  onSetDistance,
  onSetDurationSeconds,
  onRemove,
}: Props) {
  /** `null` = show stored value; string = in-progress edit (may be empty). */
  const [distanceInput, setDistanceInput] = useState<string | null>(null);
  const [durationInput, setDurationInput] = useState<string | null>(null);

  const meta = exerciseMap[log.exerciseId];
  const title = meta?.name ?? log.exerciseId;
  const done = log.completed || log.skipped;
  const healthSummary = formatCardioHealthSummary(log);

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

  return (
    <section>
      <span className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={log.completed}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-border"
          style={
            log.completed
              ? {
                  borderColor: "var(--accent)",
                  backgroundColor: "var(--accent)",
                  color: "white",
                }
              : undefined
          }
        >
          {log.completed ? "✓" : ""}
        </button>
        <span className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${
              done ? "text-muted line-through" : "text-foreground"
            }`}
          >
            {title}
          </p>
        </span>
        {overflowItems.length > 0 ? (
          <WorkoutRowOverflowMenu items={overflowItems} />
        ) : null}
      </span>
      <span className="flex gap-3 pl-11 pr-2 pb-3">
        <label className="flex-1 block">
          <span className="text-caption text-muted uppercase tracking-wider">
            Distance (mi)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={
              distanceInput ??
              (log.actualDistanceMi != null ? String(log.actualDistanceMi) : "")
            }
            onFocus={() =>
              setDistanceInput(
                log.actualDistanceMi != null
                  ? String(log.actualDistanceMi)
                  : "",
              )
            }
            onChange={(e) => setDistanceInput(e.target.value)}
            onBlur={() => {
              const val = (distanceInput ?? "").trim();
              if (val === "") onSetDistance(undefined);
              else {
                const num = parseFloat(val);
                onSetDistance(Number.isNaN(num) ? undefined : num);
              }
              setDistanceInput(null);
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
            value={durationInput ?? formatSecondsToMMSS(log.actualDuration)}
            onFocus={() =>
              setDurationInput(formatSecondsToMMSS(log.actualDuration))
            }
            onChange={(e) => setDurationInput(e.target.value)}
            onBlur={() => {
              const raw = (durationInput ?? "").trim();
              if (raw === "") {
                onSetDurationSeconds(undefined);
              } else {
                onSetDurationSeconds(parseTimeInput(raw));
              }
              setDurationInput(null);
            }}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="9:30 or 930"
          />
        </label>
      </span>
      {healthSummary ? (
        <p className="px-11 pb-3 text-xs text-muted">{healthSummary}</p>
      ) : null}
    </section>
  );
}
