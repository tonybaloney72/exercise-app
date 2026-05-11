"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CategoryBadge from "@/components/common/CategoryBadge";
import { exerciseMap } from "@/data/exercises";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import type { ExerciseCategory } from "@/types";

interface ExerciseRowProps {
  exerciseId: string;
  targetReps: string;
  category: ExerciseCategory;
  roundNumber: number;
  completed: boolean;
  skipped: boolean;
  actualReps?: number;
}

export default function ExerciseRow({
  exerciseId,
  targetReps,
  category,
  roundNumber,
  completed,
  skipped,
  actualReps,
}: ExerciseRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { toggleExercise, skipExercise, setActualReps } = useWorkoutStore();
  const exercise = exerciseMap[exerciseId];

  if (!exercise) return null;

  return (
    <div className={`transition-colors ${skipped ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-2 px-1">
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => toggleExercise(roundNumber, exerciseId)}
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
              width="14" height="14" viewBox="0 0 14 14"
              fill="none" stroke="white" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M2.5 7.5L5.5 10.5L11.5 3.5" />
            </motion.svg>
          )}
        </button>

        {/* Exercise info */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center gap-2 min-h-[44px] py-2 text-left"
        >
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium transition-all ${completed ? "text-muted line-through" : "text-foreground"}`}>
              {exercise.name}
            </p>
            <p className="text-xs text-muted">
              {targetReps}
              {actualReps != null && ` → did ${actualReps}`}
            </p>
          </div>
          <CategoryBadge category={category} />
        </button>

        {/* Skip button */}
        {!completed && !skipped && (
          <button
            type="button"
            onClick={() => skipExercise(roundNumber, exerciseId)}
            className="p-1.5 text-muted hover:text-foreground transition-colors"
            title="Skip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded detail */}
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
              <p className="text-xs text-muted">{exercise.notes}</p>

              {!exercise.isTimeBased && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted">Actual reps:</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={actualReps != null ? String(actualReps) : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setActualReps(roundNumber, exerciseId, undefined);
                      } else {
                        const num = parseInt(val, 10);
                        if (!isNaN(num)) {
                          setActualReps(roundNumber, exerciseId, num);
                        }
                      }
                    }}
                    className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-accent"
                    placeholder="—"
                  />
                </div>
              )}

              {exercise.videoUrl && (
                <a
                  href={exercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
