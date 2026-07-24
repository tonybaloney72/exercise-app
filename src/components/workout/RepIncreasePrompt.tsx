"use client";

import { useEffect, useMemo, useState } from "react";
import RepIncreaseModal from "@/components/workout/RepIncreaseModal";
import RepIncreaseTeaserCard from "@/components/workout/RepIncreaseTeaserCard";
import { evaluateRepIncreaseSuggestions } from "@/lib/repIncreaseSuggestions";
import {
  dismissRepIncreaseForWorkout,
  isRepIncreaseDismissedForWorkout,
} from "@/lib/repIncreaseSessionDismiss";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import type { WorkoutLog } from "@/types";

const TEASER_DELAY_MS = 2500;

export type RepIncreasePromptProps = {
  log: WorkoutLog;
  todayKey: string;
};

export default function RepIncreasePrompt({
  log,
  todayKey,
}: RepIncreasePromptProps) {
  const suggestRepIncreases = useSettingsStore((s) => s.suggestRepIncreases);
  const weightInventory = useSettingsStore((s) => s.weightInventory);
  const exerciseSettings = useExerciseSettingsStore((s) => s.byExerciseId);
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);

  const [teaserReady, setTeaserReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    isRepIncreaseDismissedForWorkout(log.id),
  );

  useEffect(() => {
    setDismissed(isRepIncreaseDismissedForWorkout(log.id));
    setTeaserReady(false);
    setModalOpen(false);
  }, [log.id, log.endTime]);

  const suggestions = useMemo(
    () =>
      evaluateRepIncreaseSuggestions({
        history: workoutHistory,
        completedWorkout: log,
        todayKey,
        exerciseSettings,
        enabled: suggestRepIncreases,
        weightInventory,
      }),
    [
      workoutHistory,
      log,
      todayKey,
      exerciseSettings,
      suggestRepIncreases,
      weightInventory,
    ],
  );

  useEffect(() => {
    if (suggestions.length === 0) {
      setModalOpen(false);
    }
  }, [suggestions.length]);

  useEffect(() => {
    if (suggestions.length === 0 || dismissed) {
      setTeaserReady(false);
      return;
    }
    const timer = window.setTimeout(() => setTeaserReady(true), TEASER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [suggestions.length, dismissed, log.id]);

  function handleDismiss() {
    dismissRepIncreaseForWorkout(log.id);
    setDismissed(true);
    setModalOpen(false);
  }

  if (!suggestRepIncreases || suggestions.length === 0 || dismissed) {
    return null;
  }

  return (
    <>
      {teaserReady ? (
        <RepIncreaseTeaserCard
          count={suggestions.length}
          onOpen={() => setModalOpen(true)}
          onDismiss={handleDismiss}
        />
      ) : null}
      <RepIncreaseModal
        open={modalOpen}
        suggestions={suggestions}
        todayKey={todayKey}
        onClose={handleDismiss}
        onApplied={() => {
          if (suggestions.length <= 1) {
            handleDismiss();
          }
        }}
      />
    </>
  );
}
