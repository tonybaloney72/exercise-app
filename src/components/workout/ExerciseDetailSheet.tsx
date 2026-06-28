"use client";

import BottomSheetModal from "@/components/common/BottomSheetModal";
import CategoryBadge from "@/components/common/CategoryBadge";
import TimerTargetControls from "@/components/workout/TimerTargetControls";
import { exerciseVideoLinkLabel } from "@/lib/exerciseVideoLink";
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
}: ExerciseDetailSheetProps) {
  const trimmedNotes = notes?.trim() ?? "";
  const showTimerControls =
    mode === "timer" &&
    effectiveTargetSec != null &&
    onTimerPreset != null &&
    onTimerCommitCustom != null;

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
