"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CardioActivityPickModal from "./CardioActivityPickModal";
import CardioSessionBlock from "./CardioSessionBlock";
import { getCardioLog } from "@/lib/cardioWorkoutLog";
import type { CardioActivity, CardioActivityKind, WorkoutLog } from "@/types";

interface CardioSectionProps {
  activities: CardioActivity[];
  activeWorkout: WorkoutLog;
  onToggle: (exerciseId: string) => void;
  onSkip: (exerciseId: string) => void;
  onUnskip: (exerciseId: string) => void;
  onSetDistance: (exerciseId: string, mi: number | undefined) => void;
  onSetDurationSeconds: (exerciseId: string, seconds: number | undefined) => void;
  onAddCardio: (kind: CardioActivityKind) => void;
  onRemoveCardio: (exerciseId: string) => void;
}

export default function CardioSection({
  activities,
  activeWorkout,
  onToggle,
  onSkip,
  onUnskip,
  onSetDistance,
  onSetDurationSeconds,
  onAddCardio,
  onRemoveCardio,
}: CardioSectionProps) {
  const [isOpen, setIsOpen] = useState(activities.length > 0);
  const [addOpen, setAddOpen] = useState(false);

  const activeKinds = useMemo(
    () => new Set(activities.map((a) => a.kind)),
    [activities],
  );

  const logs = useMemo(
    () =>
      activities
        .map((a) => getCardioLog(activeWorkout, a.exerciseId))
        .filter((l): l is NonNullable<typeof l> => l != null),
    [activities, activeWorkout],
  );

  const completedCount = logs.filter((e) => e.completed || e.skipped).length;
  const total = logs.length;
  const allDone = total > 0 && completedCount === total;

  return (
    <>
      <CardioActivityPickModal
        open={addOpen}
        activeKinds={activeKinds}
        onClose={() => setAddOpen(false)}
        onPick={(kind) => {
          onAddCardio(kind);
          setIsOpen(true);
        }}
      />

      <motion.div
        layout
        className="rounded-xl border border-border bg-surface overflow-hidden"
      >
        <div className="flex w-full items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
          >
            <motion.div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Cardio & Endurance
              </h3>
              {allDone ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-green-400 text-xs"
                >
                  ✓
                </motion.span>
              ) : null}
            </motion.div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted">
                {completedCount}/{total}
              </span>
              <motion.div className="h-1.5 w-16 rounded-full bg-border overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${total > 0 ? (completedCount / total) * 100 : 0}%`,
                  }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
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
                aria-hidden
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="shrink-0 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-surface-hover"
          >
            + Add
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isOpen ? (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border px-2 py-1 space-y-2">
                {activities.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-muted">
                    No cardio yet. Tap + Add to log an activity.
                  </p>
                ) : (
                  activities.map((activity) => {
                    const log = getCardioLog(activeWorkout, activity.exerciseId);
                    if (!log) return null;
                    return (
                      <CardioSessionBlock
                        key={activity.exerciseId}
                        log={log}
                        onToggle={() => onToggle(activity.exerciseId)}
                        onSkip={() => onSkip(activity.exerciseId)}
                        onUnskip={() => onUnskip(activity.exerciseId)}
                        onSetDistance={(mi) =>
                          onSetDistance(activity.exerciseId, mi)
                        }
                        onSetDurationSeconds={(sec) =>
                          onSetDurationSeconds(activity.exerciseId, sec)
                        }
                        onRemove={() => onRemoveCardio(activity.exerciseId)}
                      />
                    );
                  })
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
