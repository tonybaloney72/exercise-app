"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CompletionCheckmark from "@/components/common/CompletionCheckmark";
import { exerciseMap } from "@/core/catalog";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { resolveExpertiseFilter } from "@/lib/expertiseLevels";
import {
  effectiveExerciseId,
  getSwapCandidates,
  laterRoundOccurrencesByExerciseId,
} from "@/lib/exerciseSwap";
import { exerciseVideoLinkLabel } from "@/lib/exerciseVideoLink";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ExerciseLog, ExerciseSetMode, RoundExercise } from "@/types";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  parseRepTargetHint,
  resolveExerciseSettings,
} from "@/utils/effectiveExerciseSettings";
import TimerTargetControls from "./TimerTargetControls";
import { formatLoggedDuration } from "@/utils/time";
import { resolvePrescriptionText } from "@/utils/exerciseLogDefaults";
import SwapExerciseModal from "./SwapExerciseModal";
import CategoryBadge from "@/components/common/CategoryBadge";
import WorkoutRowMetaLine from "./WorkoutRowMetaLine";
import type { WorkoutRowMenuItem } from "./WorkoutRowOverflowMenu";
import { MenuIconDislike, MenuIconRemove, MenuIconReport, MenuIconStar, MenuIconSwap } from "./WorkoutRowMenuIcons";
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
  const [expanded, setExpanded] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapModalKey, setSwapModalKey] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const {
    toggleExercise,
    skipExercise,
    unskipExercise,
    setActualReps,
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
      getSwapCandidates(
        roundExercise.category,
        roundExercise.exerciseId,
        roundExercises,
        slotIndex,
        swapPrefs,
      ),
    [
      roundExercise.category,
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
    if (mode === "reps") {
      const r = resolveExerciseSettings(effectiveExercise, stored);
      if (r.defaultTargetReps != null) {
        return String(r.defaultTargetReps);
      }
      return resolvePrescriptionText(log) || roundExercise.targetReps;
    }
    return `Timer · ${effectiveTargetSec}s`;
  }, [
    plannedExercise,
    effectiveExercise,
    mode,
    log,
    roundExercise.targetReps,
    effectiveTargetSec,
    stored,
  ]);

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
      onClick: () => skipExercise(roundNumber, plannedId),
    });
  }
  if (log.skipped) {
    overflowItems.push({
      label: "Undo skip",
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

  const showTimerPill = mode === "timer" && !log.completed && !log.skipped;
  const detailText = showTimerPill
    ? didLine.replace(/^\s*→\s*/, "").trim() || null
    : `${prescriptionLine}${didLine}`.trim() || null;

  return (
    <div className={`transition-colors ${log.skipped ? "opacity-40" : ""}`}>
      <div className="flex items-start gap-2 px-1">
        <button
          type="button"
          onClick={() => {
            if (!log.completed && !log.skipped) vibrateOnExerciseComplete();
            toggleExercise(roundNumber, plannedId);
          }}
          className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition-all active:scale-95"
          style={{
            borderColor: log.completed
              ? "var(--accent)"
              : "var(--border-color)",
            backgroundColor: log.completed ? "var(--accent)" : "transparent",
          }}
        >
          {log.completed ? <CompletionCheckmark /> : null}
        </button>

        <WorkoutRowMetaLine
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
          onNameClick={() => setExpanded(!expanded)}
          expanded={expanded}
          onToggleExpand={() => setExpanded(!expanded)}
          menuItems={overflowItems}
          detailText={detailText}
          showTimerPill={showTimerPill}
          timerSeconds={effectiveTargetSec}
        />
      </div>

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
        laterRoundByExerciseId={laterRoundByExerciseId}
        hasSwap={Boolean(log.swappedWith)}
        onClose={() => setSwapOpen(false)}
        onPick={(id) =>
          swapRoundExercise(roundNumber, slotIndex, id, roundExercise.category)
        }
        onClearSwap={() => clearRoundExerciseSwap(roundNumber, slotIndex)}
      />

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-10 pb-3 space-y-3">
              <CategoryBadge category={effectiveExercise.category} size="sm" />
              <p className="text-xs text-muted">{effectiveExercise.notes}</p>

              <div className="space-y-1.5">
                <p className="text-caption font-medium uppercase tracking-wide text-muted">
                  This set
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRoundExerciseLoggingMode(
                        roundNumber,
                        plannedId,
                        "reps",
                      )
                    }
                    className={`rounded-lg border px-2 py-0.5 text-xs font-medium transition-colors ${
                      mode === "reps"
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface-hover text-muted hover:text-foreground"
                    }`}
                  >
                    Reps
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRoundExerciseLoggingMode(
                        roundNumber,
                        plannedId,
                        "timer",
                      )
                    }
                    className={`rounded-lg border px-2 py-0.5 text-xs font-medium transition-colors ${
                      mode === "timer"
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface-hover text-muted hover:text-foreground"
                    }`}
                  >
                    Timer
                  </button>
                </div>
              </div>

              {mode === "reps" && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted">Actual reps:</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={log.actualReps != null ? String(log.actualReps) : ""}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      if (val === "") {
                        setActualReps(roundNumber, plannedId, undefined);
                        return;
                      }
                      if (!/^\d+$/.test(val)) return;
                      const num = parseInt(val, 10);
                      if (!isNaN(num)) {
                        setActualReps(roundNumber, plannedId, num);
                      }
                    }}
                    className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-accent"
                    placeholder={actualRepsPlaceholder}
                  />
                </div>
              )}

              {mode === "timer" && (
                <div className="space-y-3">
                  <TimerTargetControls
                    effectiveSeconds={effectiveTargetSec}
                    storedTargetSeconds={log.targetDurationSeconds}
                    onPreset={(sec) =>
                      setTargetDuration(roundNumber, plannedId, sec)
                    }
                    onCommitCustom={(sec) =>
                      setTargetDuration(roundNumber, plannedId, sec)
                    }
                  />

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted shrink-0">
                      Actual duration (optional)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        log.actualDuration != null
                          ? String(log.actualDuration)
                          : ""
                      }
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        if (v === "") {
                          setActualDuration(roundNumber, plannedId, undefined);
                          return;
                        }
                        if (!/^\d+$/.test(v)) return;
                        const n = parseInt(v, 10);
                        if (!Number.isNaN(n)) {
                          setActualDuration(roundNumber, plannedId, n);
                        }
                      }}
                      className="w-20 rounded-md border border-border bg-background px-2 py-1 font-mono text-sm text-foreground outline-none focus:border-accent"
                      placeholder={String(effectiveTargetSec)}
                    />
                  </div>
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
                    aria-hidden
                  >
                    {exerciseVideoLinkLabel(effectiveExercise.videoUrl) ===
                    "Watch video" ? (
                      <polygon points="5 3 19 12 5 21 5 3" />
                    ) : (
                      <>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </>
                    )}
                  </svg>
                  {exerciseVideoLinkLabel(effectiveExercise.videoUrl)}
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
