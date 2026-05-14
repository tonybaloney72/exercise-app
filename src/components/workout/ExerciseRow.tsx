"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CategoryBadge from "@/components/common/CategoryBadge";
import { exerciseMap } from "@/data/exercises";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { getSwapCandidates } from "@/lib/exerciseSwap";
import type { ExerciseCategory } from "@/types";
import SwapExerciseModal from "./SwapExerciseModal";

interface ExerciseRowProps {
  exerciseId: string;
  targetReps: string;
  category: ExerciseCategory;
  roundNumber: number;
  slotIndex: number;
  completed: boolean;
  skipped: boolean;
  actualReps?: number;
  swappedWith?: string;
}

export default function ExerciseRow({
  exerciseId,
  targetReps,
  category,
  roundNumber,
  slotIndex,
  completed,
  skipped,
  actualReps,
  swappedWith,
}: ExerciseRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapModalKey, setSwapModalKey] = useState(0);
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const {
    toggleExercise,
    skipExercise,
    unskipExercise,
    setActualReps,
    swapRoundExercise,
    clearRoundExerciseSwap,
    shuffleRoundExercise,
  } = useWorkoutStore();

  const plannedExercise = exerciseMap[exerciseId];
  const effectiveId = swappedWith ?? exerciseId;
  const effectiveExercise = exerciseMap[effectiveId];

  const roundExercises = useMemo(() => {
    const r = activeWorkout?.rounds.find(
      (x) => x.roundNumber === roundNumber,
    );
    return r?.exercises ?? [];
  }, [activeWorkout?.rounds, roundNumber]);

  const swapCandidates = useMemo(
    () =>
      getSwapCandidates(category, exerciseId, roundExercises, slotIndex),
    [category, exerciseId, roundExercises, slotIndex],
  );

  if (!plannedExercise || !effectiveExercise) return null;

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

        {/* Exercise info */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center gap-2 min-h-[44px] py-2 text-left"
        >
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium transition-all ${
                completed ? "text-muted line-through" : "text-foreground"
              }`}
            >
              {effectiveExercise.name}
            </p>
            {swappedWith && (
              <p className="text-[10px] text-muted">
                Instead of {plannedExercise.name}
              </p>
            )}
            <p className="text-xs text-muted">
              {targetReps}
              {actualReps != null && ` → did ${actualReps}`}
            </p>
          </div>
          <CategoryBadge category={effectiveExercise.category} />
        </button>

        {!skipped && (
          <button
            type="button"
            onClick={() => {
              setSwapModalKey((k) => k + 1);
              setSwapOpen(true);
            }}
            className="p-1.5 text-muted hover:text-foreground transition-colors shrink-0"
            title="Swap exercise"
            aria-label="Swap exercise"
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
            >
              <polyline points="16 3 21 3 21 8" />
              <line x1="13" y1="11" x2="21" y2="3" />
              <polyline points="8 21 3 21 3 16" />
              <line x1="11" y1="13" x2="3" y2="21" />
            </svg>
          </button>
        )}

        {!completed && !skipped && (
          <button
            type="button"
            onClick={() => skipExercise(roundNumber, exerciseId)}
            className="p-1.5 text-muted hover:text-foreground transition-colors shrink-0"
            title="Skip"
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
            >
              <polyline points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>
        )}
        {skipped && (
          <button
            type="button"
            onClick={() => unskipExercise(roundNumber, exerciseId)}
            className="p-1.5 text-muted hover:text-foreground transition-colors shrink-0"
            title="Undo skip"
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
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        )}
      </div>

      <SwapExerciseModal
        key={swapModalKey}
        open={swapOpen}
        plannedName={plannedExercise.name}
        candidates={swapCandidates}
        hasSwap={Boolean(swappedWith)}
        onClose={() => setSwapOpen(false)}
        onPick={(id) =>
          swapRoundExercise(roundNumber, slotIndex, id, category)
        }
        onRandom={() =>
          shuffleRoundExercise(roundNumber, slotIndex, category)
        }
        onClearSwap={() =>
          clearRoundExerciseSwap(roundNumber, slotIndex)
        }
      />

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
              <p className="text-xs text-muted">{effectiveExercise.notes}</p>

              {!effectiveExercise.isTimeBased && (
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

              {effectiveExercise.videoUrl && (
                <a
                  href={effectiveExercise.videoUrl}
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
