"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  isPresetTimerSeconds,
  TIMER_DURATION_PRESET_SECONDS,
} from "@/utils/effectiveExerciseSettings";

const presetChip =
  "rounded-lg border px-2 py-0.5 text-caption font-medium transition-colors";

function clampTimerSeconds(n: number): number {
  return Math.min(999, Math.max(5, Math.round(n)));
}

export interface TimerTargetControlsProps {
  /** Effective countdown length (includes fallbacks when log has no explicit target). */
  effectiveSeconds: number;
  /** Persisted per-set target from the log, when set. */
  storedTargetSeconds: number | undefined;
  onPreset: (sec: number) => void;
  onCommitCustom: (sec: number) => void;
}

/**
 * Preset + Custom pattern for planned timer length (this set), matching Library defaults UX.
 */
export default function TimerTargetControls({
  effectiveSeconds,
  storedTargetSeconds,
  onPreset,
  onCommitCustom,
}: TimerTargetControlsProps) {
  const [customChipActive, setCustomChipActive] = useState(false);

  const inferredCustom =
    storedTargetSeconds != null
      ? !isPresetTimerSeconds(storedTargetSeconds)
      : !isPresetTimerSeconds(effectiveSeconds);

  const customChipSelected = customChipActive || inferredCustom;

  const showCustomInput = customChipSelected;

  useEffect(() => {
    setCustomChipActive(false);
  }, [storedTargetSeconds]);

  return (
    <div className="flex items-center gap-2">
      <p className="text-caption text-muted">Timer length:</p>
      <div className="flex flex-wrap gap-1.5">
        {TIMER_DURATION_PRESET_SECONDS.map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => {
              setCustomChipActive(false);
              onPreset(sec);
            }}
            className={`${presetChip} ${
              !customChipSelected && effectiveSeconds === sec
                ? "border-accent bg-accent/15 text-accent"
                : "border-border bg-surface-hover text-muted hover:text-foreground"
            }`}
          >
            {sec}s
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomChipActive(true)}
          className={`${presetChip} ${
            customChipSelected
              ? "border-accent bg-accent/15 text-accent"
              : "border-border bg-surface-hover text-muted hover:text-foreground"
          }`}
        >
          Custom
        </button>
      </div>
      {showCustomInput && (
        <div className="flex items-center gap-1.5">
          <input
            key={`custom-target-${storedTargetSeconds ?? ""}-${customChipActive}`}
            type="number"
            inputMode="numeric"
            min={5}
            max={999}
            defaultValue={effectiveSeconds}
            onBlur={(e) => {
              const n = Math.round(Number(e.currentTarget.value));
              const sec = clampTimerSeconds(
                Number.isNaN(n) ? DEFAULT_TIMER_SECONDS_FALLBACK : n,
              );
              e.currentTarget.value = String(sec);
              onCommitCustom(sec);
              setCustomChipActive(false);
            }}
            className="w-full max-w-32 rounded-lg border border-border bg-surface px-2 font-mono text-sm text-foreground outline-none focus:border-accent"
          />
        </div>
      )}
    </div>
  );
}
