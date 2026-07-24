"use client";

import { useMemo, useState } from "react";
import WorkoutCompletionCheckbox from "@/components/workout/WorkoutCompletionCheckbox";
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
import {
  formatInventoryWeightLb,
  listInventoryWeightsLb,
} from "@/lib/weightInventory";
import { formatLoggedDuration } from "@/utils/time";
import { resolvePrescriptionText } from "@/utils/exerciseLogDefaults";
import SwapExerciseModal from "./SwapExerciseModal";
import WorkoutRowMetaLine from "./WorkoutRowMetaLine";
import ExerciseDetailSheet from "./ExerciseDetailSheet";
import SetTimerPill from "./SetTimerPill";
import type { WorkoutRowMenuItem } from "./WorkoutRowOverflowMenu";
import {
  MenuIconDislike,
  MenuIconRemove,
  MenuIconReport,
  MenuIconSkip,
  MenuIconStar,
  MenuIconSwap,
  MenuIconUndoSkip,
} from "./WorkoutRowMenuIcons";
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
    const load =
      log.weightLb ??
      resolveExerciseSettings(effectiveExercise, stored).defaultWeightLb;
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

  const overflowItems: WorkoutRowMenuItem[] = [];
  if (authMode === "authenticated") {
    const isFavorite = exercisePreference === "favorite";
    const isDisliked = exercisePreference === "disliked";
    overflowItems.push({
      label: isFavorite ? "Remove favorite" : "Favorite",
      icon: <MenuIconStar filled={isFavorite} />,
      onClick: () =>
        void setPreference(effectiveId, isFavorite ? null : "favorite", {
          refreshGeneratedWeek: false,
        }),
    });
    overflowItems.push({
      label: isDisliked ? "Remove dislike" : "Dislike",
      icon: <MenuIconDislike active={isDisliked} />,
      onClick: () =>
        void setPreference(effectiveId, isDisliked ? null : "disliked", {
          refreshGeneratedWeek: false,
        }),
    });
  }
  overflowItems.push({
    label: "Report an issue",
    icon: <MenuIconReport />,
    onClick: () => setReportOpen(true),
  });
  if (!log.skipped) {
    overflowItems.push({
      label: "Swap exercise",
      icon: <MenuIconSwap />,
      onClick: () => {
        setSwapModalKey((k) => k + 1);
        setSwapOpen(true);
      },
    });
  }
  if (!log.completed && !log.skipped) {
    overflowItems.push({
      label: "Skip",
      icon: <MenuIconSkip />,
      onClick: () => skipExercise(roundNumber, plannedId),
    });
  }
  if (log.skipped) {
    overflowItems.push({
      label: "Undo skip",
      icon: <MenuIconUndoSkip />,
      onClick: () => unskipExercise(roundNumber, plannedId),
    });
  }
  if (onRemoveFromWorkout) {
    overflowItems.push({
      label: "Remove from workout",
      icon: <MenuIconRemove />,
      onClick: onRemoveFromWorkout,
    });
  }

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
    <div className="flex flex-wrap items-center gap-1.5">
      <label htmlFor={completedFieldId} className="text-xs text-muted">
        Did
      </label>
      <input
        id={completedFieldId}
        type="text"
        inputMode="numeric"
        value={
          mode === "reps"
            ? log.actualReps != null
              ? String(log.actualReps)
              : ""
            : log.actualDuration != null
              ? String(log.actualDuration)
              : ""
        }
        onChange={(e) => {
          const val = e.target.value.trim();
          if (val === "") {
            if (mode === "reps") {
              setActualReps(roundNumber, plannedId, undefined);
            } else {
              setActualDuration(roundNumber, plannedId, undefined);
            }
            return;
          }
          if (!/^\d+$/.test(val)) return;
          const num = parseInt(val, 10);
          if (Number.isNaN(num)) return;
          if (mode === "reps") {
            setActualReps(roundNumber, plannedId, num);
          } else {
            setActualDuration(roundNumber, plannedId, num);
          }
        }}
        className={`w-14 rounded-md border border-border bg-background px-2 py-0.5 text-right text-sm text-foreground outline-none focus:border-accent ${
          mode === "timer" ? "font-mono" : ""
        }`}
        placeholder={
          mode === "reps" ? actualRepsPlaceholder : String(effectiveTargetSec)
        }
        aria-label={
          mode === "reps" ? "Completed reps" : "Completed duration in seconds"
        }
      />
      {supportsLoad ? (
        <>
          <span className="text-xs text-muted">@</span>
          <input
            type="text"
            inputMode="decimal"
            value={log.weightLb != null ? String(log.weightLb) : ""}
            onChange={(e) => {
              const val = e.target.value.trim();
              if (val === "") {
                setActualWeight(roundNumber, plannedId, undefined);
                return;
              }
              if (!/^\d*\.?\d*$/.test(val)) return;
              const parsed = sanitizeWeightLb(Number(val));
              if (parsed == null) return;
              setActualWeight(roundNumber, plannedId, parsed);
            }}
            list={`weight-options-${roundNumber}-${plannedId}`}
            className="w-14 rounded-md border border-border bg-background px-2 py-0.5 text-right text-sm text-foreground outline-none focus:border-accent"
            placeholder={
              stored?.defaultWeightLb != null
                ? formatInventoryWeightLb(stored.defaultWeightLb)
                : "lb"
            }
            aria-label="Working weight in pounds"
          />
          {inventoryWeights.length > 0 ? (
            <datalist id={`weight-options-${roundNumber}-${plannedId}`}>
              {inventoryWeights.map((w) => (
                <option key={w} value={formatInventoryWeightLb(w)} />
              ))}
            </datalist>
          ) : null}
          <span className="text-xs text-muted">lb</span>
        </>
      ) : null}
    </div>
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
