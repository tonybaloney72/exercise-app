"use client";

import { useMemo, useState } from "react";
import WorkoutCompletionCheckbox from "@/components/workout/WorkoutCompletionCheckbox";
import { buildWorkoutSessionMenuItems } from "@/components/workout/buildWorkoutSessionMenuItems";
import WorkoutDidField from "@/components/workout/WorkoutDidField";
import { exerciseMap, TRAINING_CATEGORY_ORDER } from "@/core/catalog";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { resolveExpertiseFilter } from "@/lib/expertiseLevels";
import {
  effectiveExerciseId,
  getSwapCandidatesAllCategories,
  laterRoundOccurrencesByExerciseId,
} from "@/lib/exerciseSwap";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ExerciseLog, ExerciseSetMode, RoundExercise } from "@/types";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  parseRepTargetHint,
  resolveExerciseSettings,
} from "@/utils/effectiveExerciseSettings";
import {
  exerciseSupportsLoadMeta,
  formatLoadPrescription,
  inventoryKindForExercise,
  sanitizeWeightLb,
} from "@/lib/exerciseLoad";
import { buildLibraryWeightSettings } from "@/lib/libraryExerciseDefaults";
import {
  listInventoryWeightsLb,
} from "@/lib/weightInventory";
import { formatLoggedDuration } from "@/utils/time";
import { resolvePrescriptionText } from "@/utils/exerciseLogDefaults";
import SwapExerciseModal from "./SwapExerciseModal";
import ExerciseWeightField from "./ExerciseWeightField";
import WorkoutRowMetaLine from "./WorkoutRowMetaLine";
import ExerciseDetailSheet from "./ExerciseDetailSheet";
import SetTimerPill from "./SetTimerPill";
import ExerciseReportSheet from "@/components/feedback/ExerciseReportSheet";
import { vibrateOnExerciseComplete } from "@/utils/hapticFeedback";

interface ExerciseRowProps {
  roundExercise: RoundExercise;
  log: ExerciseLog;
  roundNumber: number;
  slotIndex: number;
  onRemoveFromWorkout?: () => void;
}

export default function ExerciseRow({
  roundExercise,
  log,
  roundNumber,
  slotIndex,
  onRemoveFromWorkout,
}: ExerciseRowProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapModalKey, setSwapModalKey] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const {
    toggleExercise,
    skipExercise,
    unskipExercise,
    setActualReps,
    setActualWeight,
    setActualDuration,
    setTargetDuration,
    setRoundExerciseLoggingMode,
    swapRoundExercise,
    clearRoundExerciseSwap,
  } = useWorkoutStore();

  const plannedExercise = exerciseMap[roundExercise.exerciseId];
  const effectiveId = log.swappedWith ?? roundExercise.exerciseId;
  const effectiveExercise = exerciseMap[effectiveId];
  const stored = useExerciseSettingsStore((s) => s.byExerciseId[effectiveId]);
  const upsertSettings = useExerciseSettingsStore((s) => s.upsert);

  const resolvedDefaults = useMemo(
    () =>
      effectiveExercise
        ? resolveExerciseSettings(effectiveExercise, stored)
        : null,
    [effectiveExercise, stored],
  );
  const roundExercises = useMemo(() => {
    const r = activeWorkout?.rounds.find((x) => x.roundNumber === roundNumber);
    return r?.exercises ?? [];
  }, [activeWorkout?.rounds, roundNumber]);

  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const weightInventory = useSettingsStore((s) => s.weightInventory);
  const authMode = useAuthStore((s) => s.mode);
  const preferenceMap = useExercisePreferencesStore((s) => s.byExerciseId);
  const setPreference = useExercisePreferencesStore((s) => s.setPreference);
  const exercisePreference = preferenceMap[effectiveId];
  const expertiseByGroup = useSettingsStore((s) => s.expertiseByGroup);

  const swapPrefs = useMemo(
    () => ({
      availableEquipment,
      dislikedExerciseIds: collectDislikedIds(preferenceMap),
      expertiseFilter: resolveExpertiseFilter({ expertiseByGroup }),
    }),
    [availableEquipment, preferenceMap, expertiseByGroup],
  );

  const swapCandidates = useMemo(
    () =>
      getSwapCandidatesAllCategories(
        TRAINING_CATEGORY_ORDER,
        roundExercise.exerciseId,
        roundExercises,
        slotIndex,
        swapPrefs,
      ),
    [
      roundExercise.exerciseId,
      roundExercises,
      slotIndex,
      swapPrefs,
    ],
  );

  const laterRoundByExerciseId = useMemo(() => {
    if (!activeWorkout) return new Map<string, number[]>();
    return laterRoundOccurrencesByExerciseId(
      activeWorkout.rounds.map((r) => ({
        roundNumber: r.roundNumber,
        exerciseIds: r.exercises.map((e) => effectiveExerciseId(e)),
      })),
      roundNumber,
    );
  }, [activeWorkout, roundNumber]);

  const mode: ExerciseSetMode = useMemo(() => {
    if (!plannedExercise || !effectiveExercise) return "reps";
    return (
      log.loggingMode ??
      resolveExerciseSettings(effectiveExercise, stored).defaultSetMode
    );
  }, [log.loggingMode, plannedExercise, effectiveExercise, stored]);

  const effectiveTargetSec = useMemo(() => {
    if (!effectiveExercise) return DEFAULT_TIMER_SECONDS_FALLBACK;
    const raw = log.targetDurationSeconds;
    if (raw != null && raw > 0) return Math.min(999, raw);
    const resolved = resolveExerciseSettings(effectiveExercise, stored);
    if (
      resolved.defaultSetMode === "timer" &&
      resolved.defaultTimerSeconds != null &&
      resolved.defaultTimerSeconds > 0
    ) {
      return Math.min(999, resolved.defaultTimerSeconds);
    }
    return DEFAULT_TIMER_SECONDS_FALLBACK;
  }, [log.targetDurationSeconds, effectiveExercise, stored]);

  const prescriptionLine = useMemo(() => {
    if (!plannedExercise || !effectiveExercise) return "";
    let repsOrTimer = "";
    if (mode === "reps") {
      const r = resolveExerciseSettings(effectiveExercise, stored);
      if (r.defaultTargetReps != null) {
        repsOrTimer = String(r.defaultTargetReps);
      } else {
        repsOrTimer = resolvePrescriptionText(log) || roundExercise.targetReps;
      }
    } else {
      repsOrTimer = `Timer · ${effectiveTargetSec}s`;
    }
    const load = exerciseSupportsLoadMeta(effectiveExercise)
      ? log.weightLb
      : undefined;
    return formatLoadPrescription(repsOrTimer, load);
  }, [
    plannedExercise,
    effectiveExercise,
    mode,
    log,
    roundExercise.targetReps,
    effectiveTargetSec,
    stored,
  ]);

  const supportsLoad = exerciseSupportsLoadMeta(effectiveExercise);

  const inventoryWeights = useMemo(() => {
    if (!effectiveExercise) return [] as number[];
    const kind = inventoryKindForExercise(effectiveExercise.equipment);
    if (!kind) return [] as number[];
    return listInventoryWeightsLb(weightInventory ?? {}, kind);
  }, [effectiveExercise, weightInventory]);

  const actualRepsPlaceholder = useMemo(() => {
    if (!effectiveExercise || mode !== "reps") return "-";
    const r = resolveExerciseSettings(effectiveExercise, stored);
    if (r.defaultTargetReps != null) return String(r.defaultTargetReps);
    const hint = parseRepTargetHint(
      resolvePrescriptionText(log) || roundExercise.targetReps,
    );
    return hint != null ? String(hint) : "-";
  }, [effectiveExercise, mode, stored, log, roundExercise.targetReps]);

  if (!plannedExercise || !effectiveExercise) return null;

  const plannedId = roundExercise.exerciseId;

  const didLine =
    mode === "reps" && log.actualReps != null
      ? ` → did ${log.actualReps}`
      : mode === "timer" && log.actualDuration != null
        ? ` → did ${formatLoggedDuration(log.actualDuration)}`
        : "";

  const overflowItems = buildWorkoutSessionMenuItems({
    authMode,
    preference: exercisePreference,
    onToggleFavorite: () =>
      void setPreference(
        effectiveId,
        exercisePreference === "favorite" ? null : "favorite",
        { refreshGeneratedWeek: false },
      ),
    onToggleDislike: () =>
      void setPreference(
        effectiveId,
        exercisePreference === "disliked" ? null : "disliked",
        { refreshGeneratedWeek: false },
      ),
    onReport: () => setReportOpen(true),
    swapLabel: "Swap exercise",
    onSwap: () => {
      setSwapModalKey((k) => k + 1);
      setSwapOpen(true);
    },
    completed: log.completed,
    skipped: log.skipped,
    onSkip: () => skipExercise(roundNumber, plannedId),
    onUnskip: () => unskipExercise(roundNumber, plannedId),
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
          title={`Start set timer (${effectiveTargetSec}s)`}
          target={{
            kind: "round",
            roundNumber,
            exerciseId: plannedId,
          }}
        />
      ) : (
        <p className="text-xs leading-snug text-muted tabular-nums">
          {effectiveTargetSec}s
        </p>
      )
    ) : null;

  const completedFieldId = `completed-${roundNumber}-${plannedId}`;

  const inlineCompletedInput = showInlineCompleted ? (
    <WorkoutDidField
      id={completedFieldId}
      mode={mode}
      value={mode === "reps" ? log.actualReps : log.actualDuration}
      onChange={(next) => {
        if (mode === "reps") {
          setActualReps(roundNumber, plannedId, next);
        } else {
          setActualDuration(roundNumber, plannedId, next);
        }
      }}
      placeholder={
        mode === "reps" ? actualRepsPlaceholder : String(effectiveTargetSec)
      }
      trailing={
        supportsLoad ? (
          <>
            <span className="text-xs text-muted">@</span>
            <ExerciseWeightField
              weightLb={log.weightLb}
              defaultWeightLb={
                resolveExerciseSettings(effectiveExercise, stored).defaultWeightLb
              }
              inventoryWeights={inventoryWeights}
              onChange={(next) => setActualWeight(roundNumber, plannedId, next)}
            />
          </>
        ) : null
      }
    />
  ) : null;

  const completionCheckbox = (
    <WorkoutCompletionCheckbox
      completed={log.completed}
      onClick={() => {
        if (!log.completed && !log.skipped) vibrateOnExerciseComplete();
        toggleExercise(roundNumber, plannedId);
      }}
    />
  );

  return (
    <div
      className={`transition-colors flex flex-col gap-2 ${log.skipped ? "opacity-40" : ""}`}
    >
      <div className="px-1">
        <WorkoutRowMetaLine
          leading={completionCheckbox}
          name={effectiveExercise.name}
          nameClassName={
            log.completed ? "text-muted line-through" : "text-foreground"
          }
          subName={
            log.swappedWith ? (
              <p className="mt-0.5 text-caption text-muted">
                Instead of {plannedExercise.name}
              </p>
            ) : undefined
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
        title={effectiveExercise.name}
        hint={
          log.swappedWith ? `Instead of ${plannedExercise.name}` : undefined
        }
        notes={effectiveExercise.notes}
        videoUrl={effectiveExercise.videoUrl}
        category={effectiveExercise.category}
        showCategory
        showModeToggle
        mode={mode}
        onModeChange={(next) =>
          setRoundExerciseLoggingMode(roundNumber, plannedId, next)
        }
        effectiveTargetSec={effectiveTargetSec}
        storedTargetSeconds={log.targetDurationSeconds}
        onTimerPreset={(sec) => setTargetDuration(roundNumber, plannedId, sec)}
        onTimerCommitCustom={(sec) =>
          setTargetDuration(roundNumber, plannedId, sec)
        }
        showLibraryDefaults
        catalogDefaultReps={effectiveExercise.defaultReps}
        defaultTargetReps={resolvedDefaults?.defaultTargetReps ?? null}
        defaultWeightLb={resolvedDefaults?.defaultWeightLb ?? null}
        supportsLoad={supportsLoad}
        onSaveDefaultReps={(reps) => {
          void upsertSettings(effectiveId, {
            defaultSetMode: "reps",
            defaultTimerSeconds: null,
            defaultTargetReps: reps,
            defaultWeightLb: stored?.defaultWeightLb ?? null,
          });
        }}
        onSaveDefaultWeight={(weightLb) => {
          const prevDefault =
            sanitizeWeightLb(resolvedDefaults?.defaultWeightLb) ?? undefined;
          const nextDefault = sanitizeWeightLb(weightLb) ?? undefined;
          const logged =
            sanitizeWeightLb(log.weightLb) ?? undefined;
          void upsertSettings(
            effectiveId,
            buildLibraryWeightSettings(
              resolvedDefaults?.defaultSetMode ?? mode,
              stored,
              weightLb,
            ),
          ).then(() => {
            // Keep this set in sync when it was still on the previous default.
            if (logged === prevDefault) {
              setActualWeight(roundNumber, plannedId, nextDefault);
            }
          });
        }}
      />

      <ExerciseReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        exercise={effectiveExercise}
        source="exercise_row"
        contextExtra={{
          roundNumber,
          plannedExerciseId: plannedId,
          effectiveExerciseId: effectiveId,
          swapped: Boolean(log.swappedWith),
        }}
      />

      <SwapExerciseModal
        key={swapModalKey}
        open={swapOpen}
        plannedName={plannedExercise.name}
        candidates={swapCandidates}
        initialCategory={roundExercise.category}
        categoryFilters={TRAINING_CATEGORY_ORDER}
        laterRoundByExerciseId={laterRoundByExerciseId}
        hasSwap={Boolean(log.swappedWith)}
        onClose={() => setSwapOpen(false)}
        onPick={(id) =>
          swapRoundExercise(roundNumber, slotIndex, id, roundExercise.category)
        }
        onClearSwap={() => clearRoundExerciseSwap(roundNumber, slotIndex)}
      />
    </div>
  );
}
