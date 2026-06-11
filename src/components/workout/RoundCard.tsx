"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ExerciseRow from "./ExerciseRow";
import WorkoutSectionCard from "./WorkoutSectionCard";
import type { Round, RoundLog } from "@/types";
import { useFloatingTimerStore } from "@/stores/useFloatingTimerStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { formatTimerDisplay } from "@/utils/time";
import type { WorkoutRowMenuItem } from "./WorkoutRowOverflowMenu";

interface RoundCardProps {
  round: Round;
  roundLog: RoundLog;
  /** No rest countdown when editing a finished workout. */
  disableRestTimer?: boolean;
  canRemoveRound?: boolean;
  onRemoveRound?: () => void;
  onAddExercise?: () => void;
  onRemoveExercise?: (slotIndex: number) => void;
}

export default function RoundCard({
  round,
  roundLog,
  disableRestTimer = false,
  canRemoveRound = false,
  onRemoveRound,
  onAddExercise,
  onRemoveExercise,
}: RoundCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showRestPrompt, setShowRestPrompt] = useState(false);
  const restBetweenRounds = useSettingsStore((s) => s.restBetweenRounds);
  const restTimerAutoStart = useSettingsStore((s) => s.restTimerAutoStart);

  const completedCount = roundLog.exercises.filter(
    (e) => e.completed || e.skipped,
  ).length;
  const total = roundLog.exercises.length;
  const allDone = total > 0 && completedCount === total;

  const wasDoneRef = useRef(allDone);
  useEffect(() => {
    if (disableRestTimer) return;
    if (!allDone) {
      setShowRestPrompt(false);
    } else if (!wasDoneRef.current && allDone) {
      setIsOpen(false);
      if (restTimerAutoStart) {
        setShowRestPrompt(false);
        useFloatingTimerStore.getState().startRest(restBetweenRounds);
      } else {
        setShowRestPrompt(true);
      }
    }
    wasDoneRef.current = allDone;
  }, [allDone, restBetweenRounds, restTimerAutoStart, disableRestTimer]);

  function handleStartRest() {
    setShowRestPrompt(false);
    useFloatingTimerStore.getState().startRest(restBetweenRounds);
  }

  const roundMenuItems: WorkoutRowMenuItem[] = [];
  if (onAddExercise) {
    roundMenuItems.push({
      label: "Add Exercise",
      onClick: onAddExercise,
    });
  }
  if (canRemoveRound && onRemoveRound) {
    roundMenuItems.push({
      label: "Remove Round",
      onClick: onRemoveRound,
    });
  }

  const collapsedAccessory =
    showRestPrompt && !disableRestTimer ? (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <button
          type="button"
          onClick={handleStartRest}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent/35 bg-accent/10 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/15 active:scale-[0.98]"
        >
          <span>Start rest</span>
          <span className="tabular-nums text-accent/80">
            {formatTimerDisplay(restBetweenRounds)}
          </span>
        </button>
      </motion.div>
    ) : undefined;

  return (
    <WorkoutSectionCard
      title={`Round ${round.roundNumber}`}
      open={isOpen}
      onOpenChange={setIsOpen}
      progress={{ completed: completedCount, total }}
      showDoneCheck
      menuItems={roundMenuItems}
      collapsedAccessory={collapsedAccessory}
    >
      {round.exercises.map((ex, i) => {
        const log = roundLog.exercises[i];
        if (!log) return null;
        return (
          <ExerciseRow
            key={`${round.roundNumber}-${ex.exerciseId}-${i}`}
            roundExercise={ex}
            log={log}
            roundNumber={round.roundNumber}
            slotIndex={i}
            onRemoveFromWorkout={
              onRemoveExercise ? () => onRemoveExercise(i) : undefined
            }
          />
        );
      })}
    </WorkoutSectionCard>
  );
}
