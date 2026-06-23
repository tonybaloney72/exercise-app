"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import CardioSection from "./CardioSection";
import RoundCard from "./RoundCard";
import StretchSection from "./StretchSection";
import WorkoutSessionStructurePick, {
  type SessionStructurePickTarget,
} from "./WorkoutSessionStructurePick";
import { resolveCardioActivities } from "@/lib/cardioActivities";
import RoundStructureActions from "@/components/workout/RoundStructureActions";
import { MAX_WORKOUT_ROUNDS } from "@/lib/workoutLogStructure";
import { shouldSkipStretchesForPlan } from "@/lib/restDays";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { celebrateWorkoutComplete } from "@/utils/workoutCelebration";
import {
  isCompletedWorkoutLog,
  sessionPlanForWorkoutEdit,
  stretchEntriesFromLogs,
} from "@/lib/workoutEditSession";
import { toast } from "sonner";
import type { DayPlan, WorkoutLog } from "@/types";

interface WorkoutSessionProps {
  plan: DayPlan;
  /** Hide "Save for later" (e.g. retroactive log on a past day). */
  hideSaveForLater?: boolean;
  /** Optional banner above progress (e.g. backfill context). */
  sessionBanner?: ReactNode;
  onAfterComplete?: (log: WorkoutLog) => void;
}

export default function WorkoutSession({
  plan,
  hideSaveForLater = false,
  sessionBanner,
  onAfterComplete,
}: WorkoutSessionProps) {
  const {
    activeWorkout,
    toggleCardio,
    skipCardio,
    unskipCardio,
    setCardioDistance,
    setCardioDurationSeconds,
    toggleWarmUpStretch,
    toggleCoolDownStretch,
    skipWarmUpStretch,
    unskipWarmUpStretch,
    skipCoolDownStretch,
    unskipCoolDownStretch,
    swapWarmUpStretch,
    swapCoolDownStretch,
    setWarmUpStretchTargetDuration,
    setCoolDownStretchTargetDuration,
    setWarmUpStretchActualDuration,
    setCoolDownStretchActualDuration,
    setWarmUpStretchActualReps,
    setCoolDownStretchActualReps,
    syncStretchTargetsFromLibrary,
    setWorkoutNotes,
    completeWorkout,
    discardWorkout,
    pauseWorkout,
    saveEditedWorkout,
    cancelEditingWorkout,
    insertEmptyRoundAtWorkout,
    applyRoundCopyFromPriorWorkout,
    removeRoundFromWorkout,
    removeRoundExercise,
    addRoundExercise,
    removeWarmUpStretchFromWorkout,
    addWarmUpStretchToWorkout,
    removeCoolDownStretchFromWorkout,
    addCoolDownStretchToWorkout,
    removeCardioFromWorkout,
    addCardioToWorkout,
  } = useWorkoutStore();

  const [pickTarget, setPickTarget] =
    useState<SessionStructurePickTarget | null>(null);

  const isEditing = isCompletedWorkoutLog(activeWorkout);
  const sessionPlan = useMemo(
    () =>
      activeWorkout ? sessionPlanForWorkoutEdit(activeWorkout, plan) : plan,
    [activeWorkout, plan],
  );

  const exerciseSettingsById = useExerciseSettingsStore((s) => s.byExerciseId);
  const warmUp = useMemo(() => {
    if (!activeWorkout) return sessionPlan.warmUp ?? [];
    if (activeWorkout.warmUpExercises.length > 0) {
      return stretchEntriesFromLogs(activeWorkout.warmUpExercises);
    }
    return sessionPlan.warmUp ?? [];
  }, [activeWorkout, sessionPlan.warmUp, sessionPlan]);
  const coolDown = useMemo(() => {
    if (!activeWorkout) return sessionPlan.coolDown ?? [];
    if (activeWorkout.coolDownExercises.length > 0) {
      return stretchEntriesFromLogs(activeWorkout.coolDownExercises);
    }
    return sessionPlan.coolDown ?? [];
  }, [activeWorkout, sessionPlan.coolDown, sessionPlan]);
  const cardioActivities = useMemo(
    () => resolveCardioActivities(sessionPlan),
    [sessionPlan],
  );
  const skipStretches = shouldSkipStretchesForPlan(sessionPlan);

  useEffect(() => {
    if (!activeWorkout || isEditing) return;
    syncStretchTargetsFromLibrary();
  }, [
    activeWorkout?.id,
    exerciseSettingsById,
    isEditing,
    syncStretchTargetsFromLibrary,
  ]);

  if (!activeWorkout) return null;

  const handleSaveEdits = async () => {
    const log = await saveEditedWorkout();
    if (!log) return;
    toast.success("Workout updated", {
      description: "Your changes to this session were saved.",
      duration: 3500,
    });
  };

  const totalExercises = activeWorkout.rounds.reduce(
    (acc, r) => acc + r.exercises.length,
    0,
  );
  const completedExercises = activeWorkout.rounds.reduce(
    (acc, r) =>
      acc + r.exercises.filter((e) => e.completed || e.skipped).length,
    0,
  );
  const overallProgress =
    totalExercises > 0 ? completedExercises / totalExercises : 0;

  const handleComplete = async () => {
    const log = await completeWorkout();
    if (!log) return;
    void celebrateWorkoutComplete();
    toast.success("Workout complete!", {
      description: "Nice work - your session is saved.",
      duration: 4000,
    });
    onAfterComplete?.(log);
  };

  const handleExercisePicked = (exerciseId: string) => {
    if (!pickTarget) return;
    if (pickTarget.kind === "addStrength") {
      addRoundExercise(pickTarget.roundNumber, exerciseId);
    } else if (pickTarget.kind === "addWarmUp") {
      addWarmUpStretchToWorkout(exerciseId);
    } else if (pickTarget.kind === "addCoolDown") {
      addCoolDownStretchToWorkout(exerciseId);
    }
    setPickTarget(null);
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      <WorkoutSessionStructurePick
        activeWorkout={activeWorkout}
        pickTarget={pickTarget}
        onClosePick={() => setPickTarget(null)}
        onExercisePicked={handleExercisePicked}
      />

      {sessionBanner}

      {isEditing && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
          <p className="text-sm font-medium text-foreground">
            Editing completed workout
          </p>
          <p className="text-xs text-muted mt-0.5">
            Adjust exercises, sets, stretches, or cardio - then save. Cancel
            discards changes.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted">
            Workout Progress
          </span>
          <span className="text-xs font-bold text-accent">
            {Math.round(overallProgress * 100)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-border overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-accent to-purple-500"
            animate={{ width: `${overallProgress * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {!skipStretches && (
        <StretchSection
          title="Warm-Up Stretches"
          stretchCategory="SW"
          stretches={warmUp}
          exerciseLogs={activeWorkout.warmUpExercises}
          onToggle={toggleWarmUpStretch}
          onSkip={skipWarmUpStretch}
          onUnskip={unskipWarmUpStretch}
          onSwap={isEditing ? undefined : swapWarmUpStretch}
          onSetTargetDuration={setWarmUpStretchTargetDuration}
          onSetActualDuration={setWarmUpStretchActualDuration}
          onSetActualReps={setWarmUpStretchActualReps}
          onAddStretch={() => setPickTarget({ kind: "addWarmUp" })}
          onRemoveStretch={removeWarmUpStretchFromWorkout}
        />
      )}

      <CardioSection
        activeWorkout={activeWorkout}
        onToggle={toggleCardio}
        onSkip={skipCardio}
        onUnskip={unskipCardio}
        onSetDistance={setCardioDistance}
        onSetDurationSeconds={setCardioDurationSeconds}
        onAddCardio={addCardioToWorkout}
        onRemoveCardio={removeCardioFromWorkout}
      />

      {sessionPlan.rounds.map((round, roundIndex) => {
        const roundLog = activeWorkout.rounds.find(
          (r) => r.roundNumber === round.roundNumber,
        );
        if (!roundLog) return null;
        return (
          <div key={round.roundNumber} className="flex flex-col gap-2">
            <RoundCard
              round={round}
              roundLog={roundLog}
              disableRestTimer={isEditing}
              canRemoveRound={activeWorkout.rounds.length > 1}
              onRemoveRound={() => removeRoundFromWorkout(round.roundNumber)}
              onAddExercise={() =>
                setPickTarget({
                  kind: "addStrength",
                  roundNumber: round.roundNumber,
                })
              }
              onRemoveExercise={(slotIndex) =>
                removeRoundExercise(round.roundNumber, slotIndex)
              }
            />
            <RoundStructureActions
              roundIndex={roundIndex}
              roundCount={activeWorkout.rounds.length}
              isEmptyRound={roundLog.exercises.length === 0}
              onAddRoundBelow={() => insertEmptyRoundAtWorkout(roundIndex + 1)}
              onCopyRepeat={() =>
                applyRoundCopyFromPriorWorkout(round.roundNumber, "repeat")
              }
              onCopyStructure={() =>
                applyRoundCopyFromPriorWorkout(round.roundNumber, "structure")
              }
              onCustomize={() =>
                setPickTarget({
                  kind: "addStrength",
                  roundNumber: round.roundNumber,
                })
              }
            />
          </div>
        );
      })}

      {activeWorkout.rounds.length >= MAX_WORKOUT_ROUNDS ? (
        <p className="text-xs text-muted text-center px-1">
          Maximum {MAX_WORKOUT_ROUNDS} rounds per day.
        </p>
      ) : null}

      {!skipStretches && (
        <StretchSection
          title="Cool-Down Stretches"
          stretchCategory="SC"
          stretches={coolDown}
          exerciseLogs={activeWorkout.coolDownExercises}
          onToggle={toggleCoolDownStretch}
          onSkip={skipCoolDownStretch}
          onUnskip={unskipCoolDownStretch}
          onSwap={isEditing ? undefined : swapCoolDownStretch}
          onSetTargetDuration={setCoolDownStretchTargetDuration}
          onSetActualDuration={setCoolDownStretchActualDuration}
          onSetActualReps={setCoolDownStretchActualReps}
          onAddStretch={() => setPickTarget({ kind: "addCoolDown" })}
          onRemoveStretch={removeCoolDownStretchFromWorkout}
        />
      )}

      <div className="rounded-xl border border-border bg-surface p-4">
        <label className="text-xs font-medium text-muted">
          Notes (optional)
        </label>
        <textarea
          rows={2}
          value={activeWorkout.notes ?? ""}
          onChange={(e) => setWorkoutNotes(e.target.value)}
          placeholder="How did it feel today?"
          className="mt-2 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent placeholder:text-muted"
        />
        <p className="mt-2 text-sm text-muted">
          {isEditing ? (
            "Notes are saved when you tap Save changes."
          ) : (
            <>
              Progress saves automatically. Notes are saved when you tap{" "}
              <span className="font-medium text-foreground">
                Complete Workout
              </span>
              .
            </>
          )}
        </p>
      </div>

      {!isEditing && !hideSaveForLater && (
        <button
          type="button"
          onClick={pauseWorkout}
          className="w-full rounded-xl border border-border bg-surface py-3 text-sm font-medium text-foreground transition-colors hover:border-accent/40"
        >
          Save for later
        </button>
      )}

      <div className="flex gap-3">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={cancelEditingWorkout}
              className="flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-medium text-muted transition-colors hover:text-foreground hover:border-foreground/20"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveEdits()}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white transition-colors hover:bg-accent/90 active:bg-accent/80"
            >
              Save changes
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={discardWorkout}
              className="flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-medium text-muted transition-colors hover:text-foreground hover:border-foreground/20"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => void handleComplete()}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white transition-colors hover:bg-accent/90 active:bg-accent/80"
            >
              Complete Workout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
