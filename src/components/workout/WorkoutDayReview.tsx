"use client";

import { useState, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import CategoryBadge from "@/components/common/CategoryBadge";
import { exerciseMap } from "@/data/exercises";
import { resolvePrescriptionText } from "@/utils/exerciseLogDefaults";
import { formatLoggedDuration } from "@/utils/time";
import type { DayPlan, ExerciseLog, WorkoutLog } from "@/types";

interface WorkoutDayReviewProps {
  plan: DayPlan;
  log: WorkoutLog;
  onNotesChange: (notes: string) => Promise<void>;
  /** Default: "Completed today" (use for other days, e.g. "Completed · Mon, May 12") */
  completedBannerTitle?: string;
}

function formatEndTime(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function exerciseStatusLine(log: ExerciseLog | undefined): string {
  if (!log) return "No entry logged";
  if (log.skipped) return "Skipped";
  if (!log.completed) return "Not completed";
  const parts: string[] = ["Done"];
  if (log.actualReps != null) parts.push(`${log.actualReps} reps`);
  if (log.actualDuration != null) {
    parts.push(formatLoggedDuration(log.actualDuration));
  }
  if (log.swappedWith) {
    const swap = exerciseMap[log.swappedWith];
    parts.push(`Swapped → ${swap?.name ?? log.swappedWith}`);
  }
  return parts.join(" · ");
}

export default function WorkoutDayReview({
  plan,
  log,
  onNotesChange,
  completedBannerTitle = "Completed today",
}: WorkoutDayReviewProps) {
  const [saving, setSaving] = useState(false);
  const [saveHint, setSaveHint] = useState<"idle" | "saved" | "unchanged">("idle");
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const notesKey = `${log.id}:${log.notes ?? ""}`;
  const endLabel = formatEndTime(log.endTime);

  const commitNotesIfChanged = async (): Promise<void> => {
    const el = notesRef.current;
    if (!el) return;
    const trimmed = el.value.trim();
    const prev = (log.notes ?? "").trim();
    if (trimmed === prev) {
      setSaveHint("unchanged");
      window.setTimeout(() => setSaveHint("idle"), 1800);
      return;
    }
    setSaving(true);
    setSaveHint("idle");
    try {
      await onNotesChange(trimmed);
      setSaveHint("saved");
      window.setTimeout(() => setSaveHint("idle"), 2200);
    } finally {
      setSaving(false);
    }
  };

  const handleNotesBlur = () => {
    void commitNotesIfChanged();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-4"
    >
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-green-400">
          {completedBannerTitle}
        </p>
        {endLabel && (
          <p className="mt-1 text-sm text-muted">Finished {endLabel}</p>
        )}
      </div>

      <ReviewSection title="Warm-Up Stretches">
        {log.warmUpExercises.map((entry) => {
          const ex = exerciseMap[entry.exerciseId];
          if (!ex) return null;
          return (
            <ReviewRow
              key={entry.exerciseId}
              name={ex.name}
              target={entry.targetPrescription ?? ex.defaultReps}
              detail={exerciseStatusLine(entry)}
              exerciseNotes={entry.notes}
            />
          );
        })}
      </ReviewSection>

      {plan.hasJog && (
        <ReviewSection title="Jog">
          <div className="space-y-1 px-1 py-1">
            <p className="text-sm font-medium text-foreground">Run</p>
            {log.jogSkipped ? (
              <p className="text-xs text-muted">Skipped</p>
            ) : log.jogCompleted ? (
              <p className="text-xs text-muted">
                {[
                  log.jogDistance != null ? `${log.jogDistance} mi` : null,
                  log.jogDurationSeconds != null
                    ? formatLoggedDuration(log.jogDurationSeconds)
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Logged complete"}
              </p>
            ) : (
              <p className="text-xs text-muted">Not logged as completed</p>
            )}
          </div>
        </ReviewSection>
      )}

      {plan.rounds.map((round, i) => {
        const roundLog = log.rounds[i];
        return (
          <ReviewSection key={round.roundNumber} title={`Round ${round.roundNumber}`}>
            {round.exercises.map((ex, j) => {
              const entry = roundLog?.exercises[j];
              const planned = exerciseMap[ex.exerciseId];
              const effectiveId =
                entry?.swappedWith ?? entry?.exerciseId ?? ex.exerciseId;
              const effective = exerciseMap[effectiveId];
              if (!planned || !effective) return null;
              return (
                <ReviewRow
                  key={`${round.roundNumber}-${ex.exerciseId}`}
                  name={effective.name}
                  prescribedLabel={
                    entry?.swappedWith
                      ? `Prescribed: ${planned.name}`
                      : undefined
                  }
                  target={
                    entry
                      ? resolvePrescriptionText(entry) || ex.targetReps
                      : ex.targetReps
                  }
                  detail={exerciseStatusLine(entry)}
                  exerciseNotes={entry?.notes}
                  badge={
                    <CategoryBadge category={effective.category} size="sm" />
                  }
                />
              );
            })}
          </ReviewSection>
        );
      })}

      <ReviewSection title="Cool-Down Stretches">
        {log.coolDownExercises.map((entry) => {
          const ex = exerciseMap[entry.exerciseId];
          if (!ex) return null;
          return (
            <ReviewRow
              key={entry.exerciseId}
              name={ex.name}
              target={entry.targetPrescription ?? ex.defaultReps}
              detail={exerciseStatusLine(entry)}
              exerciseNotes={entry.notes}
            />
          );
        })}
      </ReviewSection>

      <div className="rounded-xl border border-border bg-surface p-4">
        <label className="text-xs font-medium text-muted" htmlFor="review-notes">
          Notes
        </label>
        <textarea
          key={notesKey}
          ref={notesRef}
          id="review-notes"
          rows={3}
          defaultValue={log.notes ?? ""}
          onBlur={() => void handleNotesBlur()}
          placeholder="How did it feel today?"
          className="mt-2 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent placeholder:text-muted"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted">
            Tap <span className="font-medium text-foreground">Save notes</span> or
            leave this field to save on close.
          </p>
          <button
            type="button"
            disabled={saving}
            onClick={() => void commitNotesIfChanged()}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save notes"}
          </button>
        </div>
        {saveHint === "saved" && (
          <p className="mt-2 text-xs font-medium text-green-400">Saved.</p>
        )}
        {saveHint === "unchanged" && (
          <p className="mt-2 text-xs text-muted">Nothing new to save.</p>
        )}
      </div>
    </motion.div>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="divide-y divide-border px-2 py-1">{children}</div>
    </div>
  );
}

function ReviewRow({
  name,
  prescribedLabel,
  target,
  detail,
  exerciseNotes,
  badge,
}: {
  name: string;
  prescribedLabel?: string;
  target: string;
  detail: string;
  exerciseNotes?: string;
  badge?: ReactNode;
}) {
  return (
    <div className="px-2 py-2.5 space-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{name}</p>
          {prescribedLabel && (
            <p className="text-[10px] text-muted mt-0.5">{prescribedLabel}</p>
          )}
          <p className="text-xs text-muted">{target}</p>
        </div>
        {badge}
      </div>
      <p className="text-xs text-foreground/90">{detail}</p>
      {exerciseNotes && (
        <p className="text-[11px] text-muted italic pl-0.5">{exerciseNotes}</p>
      )}
    </div>
  );
}
