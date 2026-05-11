"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { exerciseMap } from "@/data/exercises";
import type { ExerciseLog, StretchEntry } from "@/types";

interface StretchSectionProps {
  title: string;
  stretches: StretchEntry[];
  exerciseLogs: ExerciseLog[];
  onToggle: (exerciseId: string) => void;
  onSkip: (exerciseId: string) => void;
  onUnskip: (exerciseId: string) => void;
}

export default function StretchSection({
  title,
  stretches,
  exerciseLogs,
  onToggle,
  onSkip,
  onUnskip,
}: StretchSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const completedCount = exerciseLogs.filter(
    (e) => e.completed || e.skipped
  ).length;
  const total = exerciseLogs.length;
  const allDone = completedCount === total && total > 0;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {allDone && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-green-400 text-xs"
            >
              ✓
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {completedCount}/{total}
          </span>
          <div className="h-1.5 w-16 rounded-full bg-border overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${total > 0 ? (completedCount / total) * 100 : 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-2 py-1 space-y-0.5">
              {stretches.map((stretch) => {
                const log = exerciseLogs.find(
                  (e) => e.exerciseId === stretch.exerciseId
                );
                const exercise = exerciseMap[stretch.exerciseId];
                if (!exercise || !log) return null;

                return (
                  <StretchRow
                    key={stretch.exerciseId}
                    name={exercise.name}
                    targetReps={stretch.targetReps}
                    completed={log.completed}
                    skipped={log.skipped}
                    videoUrl={exercise.videoUrl}
                    notes={exercise.notes}
                    onToggle={() => onToggle(stretch.exerciseId)}
                    onSkip={() => onSkip(stretch.exerciseId)}
                    onUnskip={() => onUnskip(stretch.exerciseId)}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface StretchRowProps {
  name: string;
  targetReps: string;
  completed: boolean;
  skipped: boolean;
  videoUrl?: string;
  notes: string;
  onToggle: () => void;
  onSkip: () => void;
  onUnskip: () => void;
}

function StretchRow({
  name,
  targetReps,
  completed,
  skipped,
  videoUrl,
  notes,
  onToggle,
  onSkip,
  onUnskip,
}: StretchRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`transition-colors ${skipped ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={onToggle}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition-all active:scale-95"
          style={{
            borderColor: completed ? "var(--accent)" : "var(--border-color)",
            backgroundColor: completed ? "var(--accent)" : "transparent",
          }}
        >
          {completed && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2.5 7.5L5.5 10.5L11.5 3.5" />
            </motion.svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center gap-2 min-h-[44px] py-2 text-left"
        >
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium transition-all ${
                completed ? "text-muted line-through" : skipped ? "text-muted line-through" : "text-foreground"
              }`}
            >
              {name}
            </p>
            <p className="text-xs text-muted">{targetReps}</p>
          </div>
        </button>

        {!completed && !skipped && (
          <button
            type="button"
            onClick={onSkip}
            className="p-1.5 text-muted hover:text-foreground transition-colors"
            title="Skip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>
        )}
        {skipped && (
          <button
            type="button"
            onClick={onUnskip}
            className="p-1.5 text-muted hover:text-foreground transition-colors"
            title="Undo skip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-10 pb-3 space-y-2">
              <p className="text-xs text-muted">{notes}</p>
              {videoUrl && (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Watch video
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
