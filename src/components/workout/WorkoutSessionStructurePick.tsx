"use client";

import { useMemo } from "react";
import CategoryPickModal from "@/components/workout/CategoryPickModal";
import SwapExerciseModal from "@/components/workout/SwapExerciseModal";
import { CATEGORIES, CATEGORY_ORDER } from "@/data/categories";
import { exerciseMap } from "@/data/exercises";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { getPlanAddCandidates } from "@/lib/planSlotCandidates";
import { getStretchCandidates } from "@/lib/planStretchCandidates";
import { buildStretchUsedExerciseIds } from "@/lib/stretchDefaults";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { stretchEntriesFromLogs } from "@/lib/workoutEditSession";
import type { ExerciseCategory, WorkoutLog } from "@/types";

const ROUND_ADD_CATEGORIES = CATEGORY_ORDER.filter(
  (c) => c !== "SW" && c !== "SC",
);

export type SessionStructurePickTarget =
  | { kind: "addStrength"; roundNumber: number; category: ExerciseCategory }
  | { kind: "addWarmUp" }
  | { kind: "addCoolDown" };

interface WorkoutSessionStructurePickProps {
  activeWorkout: WorkoutLog;
  pickTarget: SessionStructurePickTarget | null;
  categoryPickRound: number | null;
  onClosePick: () => void;
  onCloseCategoryPick: () => void;
  onCategoryPicked: (roundNumber: number, category: ExerciseCategory) => void;
  onExercisePicked: (exerciseId: string) => void;
}

export default function WorkoutSessionStructurePick({
  activeWorkout,
  pickTarget,
  categoryPickRound,
  onClosePick,
  onCloseCategoryPick,
  onCategoryPicked,
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
      });
    }
    const round = activeWorkout.rounds.find(
      (r) => r.roundNumber === pickTarget.roundNumber,
    );
    if (!round) return [];
    return getPlanAddCandidates({
      category: pickTarget.category,
      roundExerciseIds: round.exercises.map((e) => e.exerciseId),
      availableEquipment,
      dislikedExerciseIds: dislikedIds,
    });
  }, [pickTarget, activeWorkout, availableEquipment, dislikedIds]);

  const modalTitle = useMemo(() => {
    if (!pickTarget) return "Add exercise";
    if (pickTarget.kind === "addWarmUp") return "Add warm-up stretch";
    if (pickTarget.kind === "addCoolDown") return "Add cool-down stretch";
    return `Add ${pickTarget.category} exercise`;
  }, [pickTarget]);

  const plannedName = useMemo(() => {
    if (!pickTarget) return "Exercise";
    if (pickTarget.kind === "addWarmUp") return "Warm-up stretch";
    if (pickTarget.kind === "addCoolDown") return "Cool-down stretch";
    return CATEGORIES[pickTarget.category].name;
  }, [pickTarget]);

  return (
    <>
      <CategoryPickModal
        open={categoryPickRound != null}
        title="Choose muscle group"
        hint="Pick a category, then choose an exercise."
        categories={ROUND_ADD_CATEGORIES}
        onClose={onCloseCategoryPick}
        onPick={(category) => {
          if (categoryPickRound == null) return;
          onCategoryPicked(categoryPickRound, category);
        }}
      />
      <SwapExerciseModal
        open={pickTarget != null}
        plannedName={plannedName}
        candidates={candidates}
        laterRoundByExerciseId={new Map()}
        hasSwap={false}
        onClose={onClosePick}
        onPick={onExercisePicked}
        onClearSwap={() => {}}
      />
    </>
  );
}
