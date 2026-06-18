"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isDayPlanDraftDirty } from "@/lib/dayPlanDraft";
import { useBalanceAlertToasts } from "@/hooks/useBalanceAlertToasts";
import AnimatedSection from "@/components/common/AnimatedSection";
import WorkoutSectionCard from "@/components/workout/WorkoutSectionCard";
import SurfaceCard from "@/components/common/SurfaceCard";
import DayPlanCardioEditor from "@/components/workout/DayPlanCardioEditor";
import RoundExerciseSortableList from "@/components/workout/RoundExerciseSortableList";
import StretchPlanSection from "@/components/workout/StretchPlanSection";
import WorkoutDayTemplateToolbar from "@/components/workout/WorkoutDayTemplateToolbar";
import StretchPickModal from "@/components/workout/StretchPickModal";
import SwapExerciseModal from "@/components/workout/SwapExerciseModal";
import { CATEGORY_ORDER } from "@/core/catalog";
import { exerciseMap } from "@/core/catalog";
import { rebuildDerivedStretches } from "@/lib/dayStretchPlan";
import { buildStretchResolveContextFromStores } from "@/adapters/stretchResolveContextFromStores";
import { buildStretchUsedExerciseIds } from "@/lib/stretchDefaults";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { resolveExpertiseFilter } from "@/lib/expertiseLevels";
import {
  getPlanAddCandidatesAllCategories,
  getPlanSlotCandidates,
} from "@/lib/planSlotCandidates";
import { getStretchCandidates } from "@/lib/planStretchCandidates";
import { laterRoundOccurrencesByExerciseId } from "@/lib/exerciseSwap";
import { analyzeDayPlanBalance } from "@/lib/workoutBalanceAlerts";
import {
  applyRoundCopyFromPriorInDayPlan,
  insertEmptyRoundInDayPlan,
  type RoundCopyMode,
} from "@/lib/dayPlanRoundCopy";
import { reorderRoundExercises } from "@/lib/reorderRoundExercises";
import RoundStructureActions from "@/components/workout/RoundStructureActions";
import { MAX_WORKOUT_ROUNDS } from "@/lib/workoutLogStructure";
import { prepareDayPlanForEditor } from "@/lib/trainingWeekCustomize";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type {
  DayPlan,
  Round,
  RoundExercise,
  StretchEntry,
} from "@/types";

const ROUND_ADD_CATEGORIES = CATEGORY_ORDER.filter(
  (c) => c !== "SW" && c !== "SC",
);

type StretchSectionKey = "warmUp" | "coolDown";

type PickTarget =
  | { kind: "swap"; roundIndex: number; slotIndex: number }
  | { kind: "add"; roundIndex: number }
  | { kind: "stretch"; section: StretchSectionKey; index?: number };

function stretchCategory(section: StretchSectionKey): "SW" | "SC" {
  return section === "coolDown" ? "SC" : "SW";
}

function renumberRounds(rounds: Round[]): Round[] {
  return rounds.map((round, index) => ({
    ...round,
    roundNumber: index + 1,
  }));
}

function exerciseCountLabel(count: number): string {
  if (count === 0) return "No exercises yet";
  return `${count} exercise${count === 1 ? "" : "s"}`;
}

interface WorkoutPlanEditorProps {
  initialPlan: DayPlan;
  isCustomWeek: boolean;
  saving: boolean;
  onSave: (plan: DayPlan) => void;
  onCancel: () => void;
  onResetDay: () => void;
  /** Hide intro + cancel (e.g. week builder wizard). */
  embedded?: boolean;
  saveLabel?: string;
  onDirtyChange?: (dirty: boolean, draft: DayPlan) => void;
}

export default function WorkoutPlanEditor({
  initialPlan,
  isCustomWeek,
  saving,
  onSave,
  onCancel,
  onResetDay,
  embedded = false,
  saveLabel = "Save this day",
  onDirtyChange,
}: WorkoutPlanEditorProps) {
  const [draft, setDraft] = useState(() =>
    prepareDayPlanForEditor(initialPlan, buildStretchResolveContextFromStores()),
  );
  const [pickTarget, setPickTarget] = useState<PickTarget | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const expertiseByGroup = useSettingsStore((s) => s.expertiseByGroup);
  const prefs = useExercisePreferencesStore((s) => s.byExerciseId);
  const dislikedIds = useMemo(() => collectDislikedIds(prefs), [prefs]);
  const expertiseFilter = useMemo(
    () => resolveExpertiseFilter({ expertiseByGroup }),
    [expertiseByGroup],
  );
  const balanceAlerts = useMemo(() => analyzeDayPlanBalance(draft), [draft]);
  const hasBalanceWarning = balanceAlerts.some((a) => a.severity === "warning");
  useBalanceAlertToasts(balanceAlerts);

  const roundCopyPrefs = useMemo(
    () => ({
      availableEquipment,
      dislikedExerciseIds: dislikedIds,
      expertiseFilter,
    }),
    [availableEquipment, dislikedIds, expertiseFilter],
  );

  useEffect(() => {
    onDirtyChange?.(isDayPlanDraftDirty(initialPlan, draft), draft);
  }, [initialPlan, draft, onDirtyChange]);

  const pickCandidates = useMemo(() => {
    if (!pickTarget) return [];

    if (pickTarget.kind === "stretch") {
      const list = draft[pickTarget.section] ?? [];
      const used = buildStretchUsedExerciseIds(list, pickTarget.index);
      return getStretchCandidates({
        category: stretchCategory(pickTarget.section),
        usedExerciseIds: used,
        availableEquipment,
        dislikedExerciseIds: dislikedIds,
        exercisePreferences: prefs,
      });
    }

    const round = draft.rounds[pickTarget.roundIndex];
    if (!round) return [];

    if (pickTarget.kind === "add") {
      return getPlanAddCandidatesAllCategories({
        categories: ROUND_ADD_CATEGORIES,
        roundExerciseIds: round.exercises.map((e) => e.exerciseId),
        availableEquipment,
        dislikedExerciseIds: dislikedIds,
        expertiseFilter,
      });
    }

    const slot = round.exercises[pickTarget.slotIndex];
    if (!slot) return [];
    return getPlanSlotCandidates({
      category: slot.category,
      plannedExerciseId: slot.exerciseId,
      roundExerciseIds: round.exercises.map((e) => e.exerciseId),
      slotIndex: pickTarget.slotIndex,
      availableEquipment,
      dislikedExerciseIds: dislikedIds,
      expertiseFilter,
    });
  }, [pickTarget, draft, availableEquipment, dislikedIds, expertiseFilter]);

  const laterRoundByExerciseIdForSwap = useMemo(() => {
    if (pickTarget?.kind !== "swap") return undefined;
    const round = draft.rounds[pickTarget.roundIndex];
    if (!round) return undefined;
    return laterRoundOccurrencesByExerciseId(
      draft.rounds.map((r) => ({
        roundNumber: r.roundNumber,
        exerciseIds: r.exercises.map((e) => e.exerciseId),
      })),
      round.roundNumber,
    );
  }, [pickTarget, draft.rounds]);

  const openPickModal = useCallback((target: PickTarget) => {
    setPickTarget(target);
  }, []);

  const applyPick = useCallback(
    (exerciseId: string) => {
      if (!pickTarget) return;
      const meta = exerciseMap[exerciseId];
      if (!meta) return;

      if (pickTarget.kind === "stretch") {
        const entry: StretchEntry = {
          exerciseId: meta.id,
          targetReps: meta.defaultReps,
        };
        setDraft((prev) => {
          const list = [...(prev[pickTarget.section] ?? [])];
          if (pickTarget.index != null) {
            list[pickTarget.index] = entry;
          } else {
            list.push(entry);
          }
          return { ...prev, [pickTarget.section]: list };
        });
        setPickTarget(null);
        return;
      }

      setDraft((prev) => {
        const rounds = prev.rounds.map((r) => ({
          ...r,
          exercises: r.exercises.map((e) => ({ ...e })),
        }));
        const round = rounds[pickTarget.roundIndex];
        if (!round) return prev;

        if (pickTarget.kind === "add") {
          const slotEntry: RoundExercise = {
            exerciseId: meta.id,
            targetReps: meta.defaultReps,
            category: meta.category,
          };
          round.exercises = [...round.exercises, slotEntry];
        } else {
          const slot = round.exercises[pickTarget.slotIndex];
          if (!slot) return prev;
          slot.exerciseId = meta.id;
          slot.category = meta.category;
          slot.targetReps = meta.defaultReps;
        }

        return { ...prev, rounds };
      });
      setPickTarget(null);
    },
    [pickTarget],
  );

  const updateReps = (
    roundIndex: number,
    slotIndex: number,
    targetReps: string,
  ) => {
    setDraft((prev) => {
      const rounds = prev.rounds.map((r, ri) =>
        ri === roundIndex
          ? {
              ...r,
              exercises: r.exercises.map((ex, si) =>
                si === slotIndex ? { ...ex, targetReps } : ex,
              ),
            }
          : r,
      );
      return { ...prev, rounds };
    });
  };

  const appendRound = () => {
    setDraft((prev) => insertEmptyRoundInDayPlan(prev, prev.rounds.length));
  };

  const insertRoundBelow = (roundIndex: number) => {
    setDraft((prev) => insertEmptyRoundInDayPlan(prev, roundIndex + 1));
  };

  const applyCopyFromPrior = (roundIndex: number, mode: RoundCopyMode) => {
    setDraft((prev) =>
      applyRoundCopyFromPriorInDayPlan(prev, roundIndex, mode, roundCopyPrefs),
    );
  };

  const removeRound = (roundIndex: number) => {
    setDraft((prev) => {
      if (prev.rounds.length === 0) return prev;
      const next = prev.rounds.filter((_, ri) => ri !== roundIndex);
      return { ...prev, rounds: renumberRounds(next) };
    });
  };

  const removeSlot = (roundIndex: number, slotIndex: number) => {
    setDraft((prev) => {
      const rounds = prev.rounds.map((r, ri) => {
        if (ri !== roundIndex) return r;
        if (r.exercises.length <= 1) return r;
        return {
          ...r,
          exercises: r.exercises.filter((_, si) => si !== slotIndex),
        };
      });
      return { ...prev, rounds };
    });
  };

  const reorderSlots = (
    roundIndex: number,
    fromIndex: number,
    toIndex: number,
  ) => {
    setDraft((prev) => {
      const rounds = prev.rounds.map((r, ri) => {
        if (ri !== roundIndex) return r;
        return {
          ...r,
          exercises: reorderRoundExercises(r.exercises, fromIndex, toIndex),
        };
      });
      return { ...prev, rounds };
    });
  };

  const updateStretchTarget = (
    section: StretchSectionKey,
    index: number,
    targetReps: string,
  ) => {
    setDraft((prev) => {
      const list = [...(prev[section] ?? [])];
      const entry = list[index];
      if (!entry) return prev;
      list[index] = { ...entry, targetReps };
      return { ...prev, [section]: list };
    });
  };

  const removeStretch = (section: StretchSectionKey, index: number) => {
    setDraft((prev) => {
      const list = [...(prev[section] ?? [])];
      list.splice(index, 1);
      return { ...prev, [section]: list };
    });
  };

  const rebuildWorkoutStretches = () => {
    setDraft((prev) => {
      const { warmUp, coolDown } = rebuildDerivedStretches(
        prev,
        buildStretchResolveContextFromStores(),
      );
      return {
        ...prev,
        warmUp: warmUp.map((e) => ({ ...e })),
        coolDown: coolDown.map((e) => ({ ...e })),
      };
    });
  };

  const plannedNameForModal = useMemo(() => {
    if (!pickTarget) return "Exercise";
    if (pickTarget.kind === "stretch") {
      if (pickTarget.index != null) {
        const id = draft[pickTarget.section]?.[pickTarget.index]?.exerciseId;
        return exerciseMap[id ?? ""]?.name ?? "Stretch";
      }
      return stretchCategory(pickTarget.section) === "SW"
        ? "Warm-up stretch"
        : "Cool-down stretch";
    }
    if (pickTarget.kind === "swap") {
      const id =
        draft.rounds[pickTarget.roundIndex]?.exercises[pickTarget.slotIndex]
          ?.exerciseId;
      return exerciseMap[id ?? ""]?.name ?? "Exercise";
    }
    return "Exercise";
  }, [pickTarget, draft]);

  const stretchLists = {
    warmUp: draft.warmUp ?? [],
    coolDown: draft.coolDown ?? [],
  };

  return (
    <AnimatedSection className="flex flex-col gap-4" delay={0}>
      <DayPlanCardioEditor plan={draft} onChange={setDraft} />

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Rounds
          </p>
          <p className="text-sm text-muted leading-snug">
            New rounds start empty - choose Copy, different exercises, or
            Customize.{" "}
            <span className="font-medium text-foreground">Add round</span>{" "}
            appends at the end.
          </p>
        </div>
        {draft.rounds.length < MAX_WORKOUT_ROUNDS ? (
          <button
            type="button"
            disabled={saving}
            onClick={appendRound}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
          >
            + Add round
          </button>
        ) : null}
      </div>

      {draft.rounds.length === 0 ? (
        <SurfaceCard className="px-4 py-3">
          <p className="text-sm text-muted leading-snug">
            No strength rounds scheduled. Use{" "}
            <span className="font-medium text-foreground">Add round</span> to
            plan exercises, or add stretches and cardio below.
          </p>
        </SurfaceCard>
      ) : null}

      {draft.rounds.map((round, roundIndex) => (
        <WorkoutSectionCard
          key={round.roundNumber}
          title={`Round ${round.roundNumber}`}
          defaultOpen={roundIndex === 0 || round.exercises.length === 0}
          statusLabel={exerciseCountLabel(round.exercises.length)}
          menuItems={[
            {
              label: "Add exercise",
              onClick: () => openPickModal({ kind: "add", roundIndex }),
            },
            {
              label: "Remove round",
              onClick: () => removeRound(roundIndex),
            },
          ]}
          footer={
            <RoundStructureActions
              roundIndex={roundIndex}
              roundCount={draft.rounds.length}
              isEmptyRound={round.exercises.length === 0}
              disabled={saving}
              onAddRoundBelow={() => insertRoundBelow(roundIndex)}
              onCopyRepeat={() => applyCopyFromPrior(roundIndex, "repeat")}
              onCopyStructure={() =>
                applyCopyFromPrior(roundIndex, "structure")
              }
              onCustomize={() => openPickModal({ kind: "add", roundIndex })}
            />
          }
        >
          {round.exercises.length > 0 ? (
            <RoundExerciseSortableList
              roundIndex={roundIndex}
              exercises={round.exercises}
              saving={saving}
              onReorder={(fromIndex, toIndex) =>
                reorderSlots(roundIndex, fromIndex, toIndex)
              }
              onChangeSlot={(slotIndex) =>
                openPickModal({ kind: "swap", roundIndex, slotIndex })
              }
              onRemoveSlot={(slotIndex) => removeSlot(roundIndex, slotIndex)}
              onUpdateReps={(slotIndex, targetReps) =>
                updateReps(roundIndex, slotIndex, targetReps)
              }
            />
          ) : null}
        </WorkoutSectionCard>
      ))}

      {draft.rounds.length >= MAX_WORKOUT_ROUNDS ? (
        <p className="text-xs text-muted text-center px-1">
          Maximum {MAX_WORKOUT_ROUNDS} rounds per day.
        </p>
      ) : null}

      <StretchPlanSection
        title="Warm-up"
        collapsible
        defaultOpen={false}
        entries={stretchLists.warmUp}
        onAdd={() => openPickModal({ kind: "stretch", section: "warmUp" })}
        onChange={(index) =>
          openPickModal({ kind: "stretch", section: "warmUp", index })
        }
        onRemove={(index) => removeStretch("warmUp", index)}
        onUpdateTarget={(index, target) =>
          updateStretchTarget("warmUp", index, target)
        }
      />

      <StretchPlanSection
        title="Cool-down"
        collapsible
        defaultOpen={false}
        entries={stretchLists.coolDown}
        onAdd={() => openPickModal({ kind: "stretch", section: "coolDown" })}
        onChange={(index) =>
          openPickModal({ kind: "stretch", section: "coolDown", index })
        }
        onRemove={(index) => removeStretch("coolDown", index)}
        onUpdateTarget={(index, target) =>
          updateStretchTarget("coolDown", index, target)
        }
      />

      <WorkoutDayTemplateToolbar
        draft={draft}
        disabled={saving}
        onApply={(next) =>
          setDraft(prepareDayPlanForEditor(next, buildStretchResolveContextFromStores()))
        }
      />

      <div className="flex gap-3">
        {!embedded && (
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border bg-surface py-3.5 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(draft)}
          className="flex-1 rounded-xl bg-accent py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : saveLabel}
        </button>
      </div>

      <div className="flex flex-col rounded-xl border border-border bg-surface px-4 py-3 gap-2">
        <p className="text-xs text-muted">
          Discard unsaved edits and restore this day&apos;s auto-generated
          workout.
        </p>
        {resetConfirm ? (
          <div className="flex flex-wrap gap-2 py-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setResetConfirm(false);
                onResetDay();
              }}
              className="rounded-lg bg-red-600/90 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            >
              Yes, reset this day
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setResetConfirm(false)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:text-foreground"
            >
              Keep editing
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => setResetConfirm(true)}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover disabled:opacity-50"
          >
            Reset this day
          </button>
        )}
      </div>

      <StretchPickModal
        open={pickTarget?.kind === "stretch"}
        title={
          pickTarget?.kind === "stretch"
            ? stretchCategory(pickTarget.section) === "SW"
              ? "Choose warm-up stretch"
              : "Choose cool-down stretch"
            : "Choose stretch"
        }
        plannedName={plannedNameForModal}
        candidates={pickCandidates}
        hasSwap={pickTarget?.kind === "stretch" && pickTarget.index != null}
        onClose={() => setPickTarget(null)}
        onPick={applyPick}
      />

      <SwapExerciseModal
        open={pickTarget != null && pickTarget.kind !== "stretch"}
        mode={pickTarget?.kind === "add" ? "add" : "swap"}
        plannedName={plannedNameForModal}
        candidates={pickCandidates}
        laterRoundByExerciseId={laterRoundByExerciseIdForSwap}
        hasSwap={pickTarget?.kind === "swap"}
        emptyPoolMessage={
          pickTarget?.kind === "add"
            ? "No exercises available for this round."
            : undefined
        }
        onClose={() => setPickTarget(null)}
        onPick={applyPick}
        onClearSwap={() => {
          if (pickTarget?.kind !== "swap") return;
          const original =
            initialPlan.rounds[pickTarget.roundIndex]?.exercises[
              pickTarget.slotIndex
            ];
          if (!original) return;
          setDraft((prev) => {
            const rounds = prev.rounds.map((r) => ({
              ...r,
              exercises: r.exercises.map((e) => ({ ...e })),
            }));
            const round = rounds[pickTarget.roundIndex];
            if (round?.exercises[pickTarget.slotIndex]) {
              round.exercises[pickTarget.slotIndex] = { ...original };
            }
            return { ...prev, rounds };
          });
        }}
      />
    </AnimatedSection>
  );
}
