"use client";

import { useMemo } from "react";
import StretchPickModal from "@/components/workout/StretchPickModal";
import SwapExerciseModal from "@/components/workout/SwapExerciseModal";
import { CATEGORY_ORDER } from "@/core/catalog";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import {
  getPlanAddCandidatesAllCategories,
} from "@/lib/planSlotCandidates";
import { getStretchCandidates } from "@/lib/planStretchCandidates";
import { buildStretchUsedExerciseIds } from "@/lib/stretchDefaults";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { stretchEntriesFromLogs } from "@/lib/workoutEditSession";
import type { WorkoutLog } from "@/types";

const ROUND_ADD_CATEGORIES = CATEGORY_ORDER.filter(
  (c) => c !== "SW" && c !== "SC",
);

export type SessionStructurePickTarget =
  | { kind: "addStrength"; roundNumber: number }
  | { kind: "addWarmUp" }
  | { kind: "addCoolDown" };

interface WorkoutSessionStructurePickProps {
  activeWorkout: WorkoutLog;
  pickTarget: SessionStructurePickTarget | null;
  onClosePick: () => void;
  onExercisePicked: (exerciseId: string) => void;
}

export default function WorkoutSessionStructurePick({
  activeWorkout,
  pickTarget,
  onClosePick,
  onExercisePicked,
}: WorkoutSessionStructurePickProps) {
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const prefs = useExercisePreferencesStore((s) => s.byExerciseId);
  const dislikedIds = useMemo(() => collectDislikedIds(prefs), [prefs]);

  const candidates = useMemo(() => {
    if (!pickTarget) return [];
    if (pickTarget.kind === "addWarmUp") {
      const used = buildStretchUsedExerciseIds(
        stretchEntriesFromLogs(activeWorkout.warmUpExercises),
      );
      return getStretchCandidates({
        category: "SW",
        usedExerciseIds: used,
        availableEquipment,
        dislikedExerciseIds: dislikedIds,
        exercisePreferences: prefs,
      });
    }
    if (pickTarget.kind === "addCoolDown") {
      const used = buildStretchUsedExerciseIds(
        stretchEntriesFromLogs(activeWorkout.coolDownExercises),
      );
      return getStretchCandidates({
        category: "SC",
        usedExerciseIds: used,
        availableEquipment,
        dislikedExerciseIds: dislikedIds,
        exercisePreferences: prefs,
      });
    }
    const round = activeWorkout.rounds.find(
      (r) => r.roundNumber === pickTarget.roundNumber,
    );
    if (!round) return [];
    return getPlanAddCandidatesAllCategories({
      categories: ROUND_ADD_CATEGORIES,
      roundExerciseIds: round.exercises.map((e) => e.exerciseId),
      availableEquipment,
      dislikedExerciseIds: dislikedIds,
    });
  }, [pickTarget, activeWorkout, availableEquipment, dislikedIds, prefs]);

  const modalTitle = useMemo(() => {
    if (!pickTarget) return "Add exercise";
    if (pickTarget.kind === "addWarmUp") return "Add warm-up stretch";
    if (pickTarget.kind === "addCoolDown") return "Add cool-down stretch";
    return "Add exercise";
  }, [pickTarget]);

  return (
    <>
      <StretchPickModal
        open={
          pickTarget?.kind === "addWarmUp" || pickTarget?.kind === "addCoolDown"
        }
        title={modalTitle}
        candidates={candidates}
        onClose={onClosePick}
        onPick={onExercisePicked}
      />

      <SwapExerciseModal
        open={pickTarget?.kind === "addStrength"}
        mode="add"
        plannedName="Exercise"
        candidates={candidates}
        laterRoundByExerciseId={new Map()}
        hasSwap={false}
        onClose={onClosePick}
        onPick={onExercisePicked}
        onClearSwap={() => {}}
        emptyPoolMessage="No exercises available for this round."
      />
    </>
  );
}
