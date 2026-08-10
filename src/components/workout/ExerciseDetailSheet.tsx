"use client";

import { useMemo } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import CategoryBadge from "@/components/common/CategoryBadge";
import TimerTargetControls from "@/components/workout/TimerTargetControls";
import { exerciseVideoLinkLabel } from "@/lib/exerciseVideoLink";
import {
  parseLibraryDefaultRepsInput,
  parseLibraryDefaultWeightInput,
} from "@/lib/libraryExerciseDefaults";
import { formatInventoryWeightLb } from "@/lib/weightInventory";
import type { ExerciseCategory, ExerciseSetMode } from "@/types";

const modeChip =
  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors";

type ExerciseDetailSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  hint?: string;
  notes?: string;
  videoUrl?: string | null;
  category?: ExerciseCategory;
  mode: ExerciseSetMode;
  showCategory?: boolean;
  showModeToggle?: boolean;
  onModeChange?: (mode: ExerciseSetMode) => void;
  effectiveTargetSec?: number;
  storedTargetSeconds?: number;
  onTimerPreset?: (sec: number) => void;
  onTimerCommitCustom?: (sec: number) => void;
  /** Library defaults editable during a workout. */
  showLibraryDefaults?: boolean;
  catalogDefaultReps?: string;
  defaultTargetReps?: number | null;
  defaultWeightLb?: number | null;
  supportsLoad?: boolean;
  onSaveDefaultReps?: (reps: number | null) => void;
  onSaveDefaultWeight?: (weightLb: number | null) => void;
};

function ExerciseVideoLink({ url }: { url: string }) {
  const label = exerciseVideoLinkLabel(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-hover px-3 py-2.5 text-sm font-medium text-accent transition-colors hover:border-accent/30"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {label === "Watch video" ? (
          <polygon points="5 3 19 12 5 21 5 3" />
        ) : (
          <>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </>
        )}
      </svg>
      {label}
    </a>
  );
}

export default function ExerciseDetailSheet({
  open,
  onClose,
  title,
  hint,
  notes,
  videoUrl,
  category,
  mode,
  showCategory = false,
  showModeToggle = false,
  onModeChange,
  effectiveTargetSec,
  storedTargetSeconds,
  onTimerPreset,
  onTimerCommitCustom,
  showLibraryDefaults = false,
  catalogDefaultReps = "",
  defaultTargetReps = null,
  defaultWeightLb = null,
  supportsLoad = false,
  onSaveDefaultReps,
  onSaveDefaultWeight,
}: ExerciseDetailSheetProps) {
  const trimmedNotes = notes?.trim() ?? "";
  const showTimerControls =
    mode === "timer" &&
    effectiveTargetSec != null &&
    onTimerPreset != null &&
    onTimerCommitCustom != null;

  const repsFieldValue = useMemo(() => {
    if (defaultTargetReps != null && defaultTargetReps > 0) {
      return String(defaultTargetReps);
    }
    return "";
  }, [defaultTargetReps]);

  const weightFieldValue = useMemo(() => {
    if (defaultWeightLb != null && defaultWeightLb > 0) {
      return formatInventoryWeightLb(defaultWeightLb);
    }
    return "";
  }, [defaultWeightLb]);

  const showDefaults =
    showLibraryDefaults &&
    (onSaveDefaultReps != null || (supportsLoad && onSaveDefaultWeight != null));

  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      title={title}
      hint={hint}
      maxWidth="lg"
      bodyClassName="px-4 py-4"
      initialFocus="none"
    >
      <div className="flex flex-col gap-5">
        {showCategory && category ? (
          <CategoryBadge category={category} size="sm" />
        ) : null}

        {showModeToggle && onModeChange ? (
          <section className="flex flex-col gap-2">
            <p className="text-caption font-medium tracking-wide text-muted">
              This set
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onModeChange("reps")}
                className={`${modeChip} ${
                  mode === "reps"
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-surface-hover text-muted hover:text-foreground"
                }`}
              >
                Reps
              </button>
              <button
                type="button"
                onClick={() => onModeChange("timer")}
                className={`${modeChip} ${
                  mode === "timer"
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-surface-hover text-muted hover:text-foreground"
                }`}
              >
                Timer
              </button>
            </div>
          </section>
        ) : null}

        {showTimerControls ? (
          <TimerTargetControls
            effectiveSeconds={effectiveTargetSec}
            storedTargetSeconds={storedTargetSeconds}
            onPreset={onTimerPreset}
            onCommitCustom={onTimerCommitCustom}
          />
        ) : null}

        {showDefaults ? (
          <section className="flex flex-col gap-3">
            <div>
              <p className="text-caption font-medium tracking-wide text-muted">
                Library defaults
              </p>
              <p className="mt-0.5 text-caption text-muted">
                Saves for future workouts. Clear a field and tap away to unset.
              </p>
            </div>

            {onSaveDefaultReps && mode === "reps" ? (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="detail-default-reps"
                  className="text-caption font-medium text-muted"
                >
                  Default reps
                </label>
                <input
                  id="detail-default-reps"
                  key={`detail-reps-${repsFieldValue}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  defaultValue={repsFieldValue}
                  placeholder={catalogDefaultReps || "reps"}
                  onBlur={(e) => {
                    const reps = parseLibraryDefaultRepsInput(
                      e.currentTarget.value,
                      catalogDefaultReps,
                    );
                    if (reps != null) e.currentTarget.value = String(reps);
                    onSaveDefaultReps(reps);
                  }}
                  className="w-full max-w-32 rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
            ) : null}

            {supportsLoad && onSaveDefaultWeight ? (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="detail-default-weight"
                  className="text-caption font-medium text-muted"
                >
                  Default weight (lb)
                </label>
                <input
                  id="detail-default-weight"
                  key={`detail-weight-${weightFieldValue}`}
                  type="number"
                  inputMode="decimal"
                  min={0.5}
                  max={500}
                  step={0.5}
                  defaultValue={weightFieldValue}
                  placeholder="lb"
                  onBlur={(e) => {
                    const weight = parseLibraryDefaultWeightInput(
                      e.currentTarget.value,
                    );
                    if (weight === undefined) {
                      e.currentTarget.value = weightFieldValue;
                      return;
                    }
                    if (weight != null) {
                      e.currentTarget.value = formatInventoryWeightLb(weight);
                    }
                    onSaveDefaultWeight(weight);
                  }}
                  className="w-full max-w-32 rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {trimmedNotes.length > 0 ? (
          <section className="flex flex-col gap-1.5">
            <p className="text-caption font-medium tracking-wide text-muted">
              Notes
            </p>
            <p className="text-sm leading-relaxed text-foreground/90">
              {trimmedNotes}
            </p>
          </section>
        ) : null}

        {videoUrl ? <ExerciseVideoLink url={videoUrl} /> : null}
      </div>
    </BottomSheetModal>
  );
}
