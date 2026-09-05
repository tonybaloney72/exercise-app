"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WorkoutCompletionCheckbox from "@/components/workout/WorkoutCompletionCheckbox";
import WorkoutSectionCard from "@/components/workout/WorkoutSectionCard";
import { buildWorkoutSessionMenuItems } from "@/components/workout/buildWorkoutSessionMenuItems";
import WorkoutDidField from "@/components/workout/WorkoutDidField";
import { exerciseMap } from "@/core/catalog";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { getStretchSwapCandidates } from "@/lib/stretchSwap";
import { uiAddChipClass } from "@/lib/uiClasses";
import { vibrateOnExerciseComplete } from "@/utils/hapticFeedback";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import WorkoutRowMetaLine from "./WorkoutRowMetaLine";
import SetTimerPill from "./SetTimerPill";
import ExerciseReportSheet from "@/components/feedback/ExerciseReportSheet";
import SwapExerciseModal from "./SwapExerciseModal";
import ExerciseDetailSheet from "./ExerciseDetailSheet";
import type { ExerciseLog, ExerciseSetMode, StretchEntry } from "@/types";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  parseRepTargetHint,
  resolveExerciseSettings,
  resolveStretchTimerTargetSeconds,
} from "@/utils/effectiveExerciseSettings";
import { formatLoggedDuration } from "@/utils/time";

interface StretchSectionProps {
  title: string;
  stretchCategory: "SW" | "SC";
  stretches: StretchEntry[];
  exerciseLogs: ExerciseLog[];
  onToggle: (exerciseId: string) => void;
  onSkip: (exerciseId: string) => void;
  onUnskip: (exerciseId: string) => void;
  onSwap?: (fromExerciseId: string, toExerciseId: string) => void;
  onSetTargetDuration: (exerciseId: string, seconds: number) => void;
  onSetActualDuration: (
    exerciseId: string,
    seconds: number | undefined,
  ) => void;
  onSetActualReps: (
    exerciseId: string,
    reps: number | undefined,
  ) => void;
  onAddStretch?: () => void;
  onRemoveStretch?: (exerciseId: string) => void;
}

export default function StretchSection({
  title,
  stretches,
  exerciseLogs,
  stretchCategory,
  onToggle,
  onSkip,
  onUnskip,
  onSwap,
  onSetTargetDuration,
  onSetActualDuration,
  onSetActualReps,
  onAddStretch,
  onRemoveStretch,
}: StretchSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const usedStretchIds = useMemo(
    () => new Set(stretches.map((s) => s.exerciseId)),
    [stretches],
  );

  const completedCount = exerciseLogs.filter(
    (e) => e.completed || e.skipped,
  ).length;
  const total = exerciseLogs.length;
  const allDone = completedCount === total && total > 0;

  const wasDoneRef = useRef(allDone);
  useEffect(() => {
    if (allDone && !wasDoneRef.current) {
      setIsOpen(false);
    }
    wasDoneRef.current = allDone;
  }, [allDone]);

  return (
    <WorkoutSectionCard
      title={title}
      open={isOpen}
      onOpenChange={setIsOpen}
      progress={{ completed: completedCount, total }}
      showDoneCheck
      headerAction={
        onAddStretch ? (
          <button type="button" onClick={onAddStretch} className={uiAddChipClass}>
            + Add
          </button>
        ) : null
      }
    >
      <div className="flex flex-col gap-0.5">
        {stretches.map((stretch) => {
          const log = exerciseLogs.find(
            (e) => e.exerciseId === stretch.exerciseId,
          );
          const exercise = exerciseMap[stretch.exerciseId];
          if (!exercise || !log) return null;

          return (
            <StretchRow
              key={stretch.exerciseId}
              exerciseId={stretch.exerciseId}
              targetReps={stretch.targetReps}
              log={log}
              onToggle={() => {
                if (!log.completed && !log.skipped) {
                  vibrateOnExerciseComplete();
                }
                onToggle(stretch.exerciseId);
              }}
              onSkip={() => onSkip(stretch.exerciseId)}
              onUnskip={() => onUnskip(stretch.exerciseId)}
              onSwap={onSwap}
              stretchCategory={stretchCategory}
              usedStretchIds={usedStretchIds}
              onSetTargetDuration={(sec) =>
                onSetTargetDuration(stretch.exerciseId, sec)
              }
              onSetActualDuration={(sec) =>
                onSetActualDuration(stretch.exerciseId, sec)
              }
              onSetActualReps={(reps) =>
                onSetActualReps(stretch.exerciseId, reps)
              }
              onRemoveFromWorkout={
                onRemoveStretch
                  ? () => onRemoveStretch(stretch.exerciseId)
                  : undefined
              }
            />
          );
        })}
      </div>
    </WorkoutSectionCard>
  );
}

interface StretchRowProps {
  exerciseId: string;
  targetReps: string;
  log: ExerciseLog;
  stretchCategory: "SW" | "SC";
  usedStretchIds: ReadonlySet<string>;
  onToggle: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  onSwap?: (fromExerciseId: string, toExerciseId: string) => void;
  onSetTargetDuration: (seconds: number) => void;
  onSetActualDuration: (seconds: number | undefined) => void;
  onSetActualReps: (reps: number | undefined) => void;
  onRemoveFromWorkout?: () => void;
}

function StretchRow({
  exerciseId,
  targetReps,
  log,
  stretchCategory,
  usedStretchIds,
  onToggle,
  onSkip,
  onUnskip,
  onSwap,
  onSetTargetDuration,
  onSetActualDuration,
  onSetActualReps,
  onRemoveFromWorkout,
}: StretchRowProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapModalKey, setSwapModalKey] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const exercise = exerciseMap[exerciseId];
  const stored = useExerciseSettingsStore((s) => s.byExerciseId[exerciseId]);
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const authMode = useAuthStore((s) => s.mode);
  const preferenceMap = useExercisePreferencesStore((s) => s.byExerciseId);
  const setPreference = useExercisePreferencesStore((s) => s.setPreference);
  const exercisePreference = preferenceMap[exerciseId];
  const swapCandidates = useMemo(
    () =>
      onSwap
        ? getStretchSwapCandidates({
            section: stretchCategory === "SC" ? "coolDown" : "warmUp",
            currentExerciseId: exerciseId,
            usedExerciseIds: usedStretchIds,
            availableEquipment,
            dislikedExerciseIds: collectDislikedIds(preferenceMap),
          })
        : [],
    [
      onSwap,
      stretchCategory,
      exerciseId,
      usedStretchIds,
      availableEquipment,
      preferenceMap,
    ],
  );

  const mode: ExerciseSetMode = useMemo(() => {
    if (!exercise) return "reps";
    return (
      log.loggingMode ??
      resolveExerciseSettings(exercise, stored).defaultSetMode
    );
  }, [log.loggingMode, exercise, stored]);

  const effectiveTargetSec = useMemo(() => {
    if (!exercise || mode !== "timer") return DEFAULT_TIMER_SECONDS_FALLBACK;
    return resolveStretchTimerTargetSeconds(
      exercise,
      stored,
      log.targetDurationSeconds,
      targetReps,
    );
  }, [exercise, mode, stored, log.targetDurationSeconds, targetReps]);

  const prescriptionLine = useMemo(() => {
    if (!exercise) return targetReps;
    if (mode === "timer") return `Timer · ${effectiveTargetSec}s`;
    const r = resolveExerciseSettings(exercise, stored);
    return r.defaultTargetReps != null
      ? String(r.defaultTargetReps)
      : targetReps;
  }, [exercise, mode, targetReps, effectiveTargetSec, stored]);

  const didLine =
    mode === "reps" && log.actualReps != null
      ? ` → did ${log.actualReps}`
      : mode === "timer" && log.actualDuration != null
        ? ` → did ${formatLoggedDuration(log.actualDuration)}`
        : "";

  const repsPlaceholder = useMemo(() => {
    if (!exercise || mode !== "reps") return "-";
    const r = resolveExerciseSettings(exercise, stored);
    if (r.defaultTargetReps != null) return String(r.defaultTargetReps);
    const hint = parseRepTargetHint(targetReps);
    return hint != null ? String(hint) : "-";
  }, [exercise, mode, stored, targetReps]);

  if (!exercise) return null;

  const overflowItems = buildWorkoutSessionMenuItems({
    authMode,
    preference: exercisePreference,
    onToggleFavorite: () =>
      void setPreference(
        exerciseId,
        exercisePreference === "favorite" ? null : "favorite",
        { refreshGeneratedWeek: false },
      ),
    onToggleDislike: () =>
      void setPreference(
        exerciseId,
        exercisePreference === "disliked" ? null : "disliked",
        { refreshGeneratedWeek: false },
      ),
    onReport: () => setReportOpen(true),
    swapLabel: onSwap ? "Swap stretch" : undefined,
    onSwap: onSwap
      ? () => {
          setSwapModalKey((k) => k + 1);
          setSwapOpen(true);
        }
      : undefined,
    completed: log.completed,
    skipped: log.skipped,
    onSkip,
    onUnskip,
    onRemove: onRemoveFromWorkout,
  });

  const showInlineCompleted =
    !log.skipped && (mode === "reps" || mode === "timer");

  const detailText =
    showInlineCompleted && mode === "reps"
      ? prescriptionLine.trim() || null
      : !showInlineCompleted
        ? `${prescriptionLine}${didLine}`.trim() || null
        : null;

  const detailLeading =
    showInlineCompleted && mode === "timer" ? (
      !log.completed ? (
        <SetTimerPill
          seconds={effectiveTargetSec}
          title={`Start stretch timer (${effectiveTargetSec}s)`}
          target={{
            kind: stretchCategory === "SC" ? "coolDown" : "warmUp",
            exerciseId,
          }}
        />
      ) : (
        <p className="text-xs leading-snug text-muted tabular-nums">
          {effectiveTargetSec}s
        </p>
      )
    ) : null;

  const completedFieldId = `completed-stretch-${exerciseId}`;

  const inlineCompletedInput = showInlineCompleted ? (
    <WorkoutDidField
      id={completedFieldId}
      mode={mode}
      value={mode === "reps" ? log.actualReps : log.actualDuration}
      onChange={(next) => {
        if (mode === "reps") {
          onSetActualReps(next);
        } else {
          onSetActualDuration(next);
        }
      }}
      placeholder={
        mode === "reps" ? repsPlaceholder : String(effectiveTargetSec)
      }
    />
  ) : null;

  const completionCheckbox = (
    <WorkoutCompletionCheckbox completed={log.completed} onClick={onToggle} />
  );

  return (
    <div className={`transition-colors ${log.skipped ? "opacity-40" : ""}`}>
      <ExerciseReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        exercise={exercise}
        source="exercise_row"
        contextExtra={{
          stretchCategory,
          exerciseId,
        }}
      />
      {onSwap ? (
        <SwapExerciseModal
          key={swapModalKey}
          open={swapOpen}
          plannedName={exercise?.name ?? exerciseId}
          candidates={swapCandidates}
          hasSwap={false}
          onClose={() => setSwapOpen(false)}
          onPick={(id) => onSwap(exerciseId, id)}
          onClearSwap={() => {}}
        />
      ) : null}
      <div className="px-1">
        <WorkoutRowMetaLine
          leading={completionCheckbox}
          name={exercise.name}
          nameClassName={
            log.completed || log.skipped
              ? "text-muted line-through"
              : "text-foreground"
          }
          onNameClick={() => setDetailOpen(true)}
          opensDetailSheet
          menuItems={overflowItems}
          detailText={detailText}
          detailLeading={detailLeading}
          detailTrailing={inlineCompletedInput}
        />
      </div>

      <ExerciseDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={exercise.name}
        notes={exercise.notes}
        videoUrl={exercise.videoUrl}
        mode={mode}
        effectiveTargetSec={effectiveTargetSec}
        storedTargetSeconds={log.targetDurationSeconds}
        onTimerPreset={onSetTargetDuration}
        onTimerCommitCustom={onSetTargetDuration}
      />
    </div>
  );
}
