"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isDayPlanDraftDirty } from "@/lib/dayPlanDraft";
import { useBalanceAlertToasts } from "@/hooks/useBalanceAlertToasts";
import AnimatedSection from "@/components/common/AnimatedSection";
import CollapsibleSection from "@/components/common/CollapsibleSection";
import SurfaceCard from "@/components/common/SurfaceCard";
import CategoryPickModal from "@/components/workout/CategoryPickModal";
import DayPlanCardioEditor from "@/components/workout/DayPlanCardioEditor";
import RoundExerciseSortableList from "@/components/workout/RoundExerciseSortableList";
import StretchPlanSection from "@/components/workout/StretchPlanSection";
import SwapExerciseModal from "@/components/workout/SwapExerciseModal";
import { CATEGORIES, CATEGORY_ORDER } from "@/data/categories";
import { exerciseMap } from "@/data/exercises";
import { rebuildDerivedStretches } from "@/lib/dayStretchPlan";
import { buildStretchResolveContext } from "@/lib/stretchResolveContext";
import { buildStretchUsedExerciseIds } from "@/lib/stretchDefaults";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { getPlanAddCandidates, getPlanSlotCandidates } from "@/lib/planSlotCandidates";
import { getStretchCandidates } from "@/lib/planStretchCandidates";
import { laterRoundOccurrencesByExerciseId } from "@/lib/exerciseSwap";
import { analyzeDayPlanBalance } from "@/lib/workoutBalanceAlerts";
import { reorderRoundExercises } from "@/lib/reorderRoundExercises";
import { prepareDayPlanForEditor } from "@/lib/trainingWeekCustomize";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type {
  DayPlan,
  ExerciseCategory,
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
  | { kind: "add"; roundIndex: number; category: ExerciseCategory }
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
  const [draft, setDraft] = useState(() => prepareDayPlanForEditor(initialPlan));
  const [pickTarget, setPickTarget] = useState<PickTarget | null>(null);
  const [categoryPickRound, setCategoryPickRound] = useState<number | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const prefs = useExercisePreferencesStore((s) => s.byExerciseId);
  const dislikedIds = useMemo(() => collectDislikedIds(prefs), [prefs]);
  const balanceAlerts = useMemo(() => analyzeDayPlanBalance(draft), [draft]);
  const hasBalanceWarning = balanceAlerts.some((a) => a.severity === "warning");
  useBalanceAlertToasts(balanceAlerts);

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
      });
    }

    const round = draft.rounds[pickTarget.roundIndex];
    if (!round) return [];

    if (pickTarget.kind === "add") {
      return getPlanAddCandidates({
        category: pickTarget.category,
        roundExerciseIds: round.exercises.map((e) => e.exerciseId),
        availableEquipment,
        dislikedExerciseIds: dislikedIds,
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
    });
  }, [pickTarget, draft, availableEquipment, dislikedIds]);

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

  const updateReps = (roundIndex: number, slotIndex: number, targetReps: string) => {
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

  const addRound = () => {
    setDraft((prev) => ({
      ...prev,
      rounds: renumberRounds([
        ...prev.rounds,
        { roundNumber: prev.rounds.length + 1, exercises: [] },
      ]),
    }));
  };

  const removeRound = (roundIndex: number) => {
    setDraft((prev) => {
      if (prev.rounds.length <= 1) return prev;
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
        buildStretchResolveContext(),
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
      return stretchCategory(pickTarget.section) === "SW" ? "Warm-up stretch" : "Cool-down stretch";
    }
    if (pickTarget.kind === "swap") {
      const id =
        draft.rounds[pickTarget.roundIndex]?.exercises[pickTarget.slotIndex]?.exerciseId;
      return exerciseMap[id ?? ""]?.name ?? "Exercise";
    }
    return CATEGORIES[pickTarget.category].name;
  }, [pickTarget, draft]);

  const stretchLists = {
    warmUp: draft.warmUp ?? [],
    coolDown: draft.coolDown ?? [],
  };

  return (
    <AnimatedSection className="space-y-4" delay={0}>
      {!embedded && (
        <SurfaceCard className="border-accent/40 bg-accent/10 p-4 space-y-1.5">
          <p className="text-sm font-semibold text-foreground">Customize workout</p>
          <p className="text-sm text-muted leading-snug">
            Change exercises and targets for this day. Pick any category when adding slots;
            change keeps the same category. Use the grip on the left of each exercise to
            reorder within a round (needs two or more exercises in that round).
          </p>
          {isCustomWeek ? (
            <p className="text-xs text-muted leading-snug">
              This week is customized — settings updates change today and upcoming days only
              (not past days). Reset from Weekly restores the full auto-generated week.
            </p>
          ) : (
            <p className="text-xs text-muted leading-snug">
              Saving marks this week as customized.
            </p>
          )}
        </SurfaceCard>
      )}

      <DayPlanCardioEditor plan={draft} onChange={setDraft} />

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Rounds
          </p>
          <p className="text-[11px] text-muted leading-snug">
            Drag the grip to reorder exercises in a round.
          </p>
        </div>
        <button
          type="button"
          disabled={saving || draft.rounds.length >= 6}
          onClick={addRound}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
        >
          + Add round
        </button>
      </div>

      {draft.rounds.map((round, roundIndex) => (
        <CollapsibleSection
          key={round.roundNumber}
          title={`Round ${round.roundNumber}`}
          hint={
            round.exercises.length === 0
              ? "No exercises yet"
              : `${round.exercises.length} exercise${
                  round.exercises.length === 1 ? "" : "s"
                }`
          }
          defaultOpen={roundIndex === 0}
          toolbar={
            <div className="flex w-full items-center justify-between gap-3">
              <button
                type="button"
                disabled={draft.rounds.length <= 1 || saving}
                onClick={() => removeRound(roundIndex)}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover disabled:opacity-40"
              >
                Remove round
              </button>
              <button
                type="button"
                onClick={() => setCategoryPickRound(roundIndex)}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover"
              >
                + Add exercise
              </button>
            </div>
          }
        >
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
        </CollapsibleSection>
      ))}

      {balanceAlerts.length > 0 && (
        <SurfaceCard
          className={`space-y-2 p-4 ${
            hasBalanceWarning
              ? "border-amber-500/50 bg-amber-500/10"
              : "border-border"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-wider ${
              hasBalanceWarning ? "text-amber-800 dark:text-amber-200" : "text-muted"
            }`}
          >
            Balance notes
          </p>
          <ul className="space-y-2">
            {balanceAlerts.map((alert) => (
              <li
                key={alert.id}
                className={`text-sm leading-snug ${
                  alert.severity === "warning"
                    ? "text-amber-900 dark:text-amber-100"
                    : "text-muted"
                }`}
              >
                {alert.message}
              </li>
            ))}
          </ul>
        </SurfaceCard>
      )}

      <p className="px-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted">
        Stretches (optional)
      </p>
      <p className="px-1 text-xs text-muted leading-snug">
        Defaults live in Settings. Override warm-up or cool-down for this day only.
      </p>

      <StretchPlanSection
        title="Warm-up"
        collapsible
        defaultOpen={false}
        entries={stretchLists.warmUp}
        onAdd={() => openPickModal({ kind: "stretch", section: "warmUp" })}
        onChange={(index) => openPickModal({ kind: "stretch", section: "warmUp", index })}
        onRemove={(index) => removeStretch("warmUp", index)}
        onUpdateTarget={(index, target) => updateStretchTarget("warmUp", index, target)}
      />

      <StretchPlanSection
        title="Cool-down"
        collapsible
        defaultOpen={false}
        entries={stretchLists.coolDown}
        onAdd={() => openPickModal({ kind: "stretch", section: "coolDown" })}
        onChange={(index) => openPickModal({ kind: "stretch", section: "coolDown", index })}
        onRemove={(index) => removeStretch("coolDown", index)}
        onUpdateTarget={(index, target) => updateStretchTarget("coolDown", index, target)}
      />

      <SurfaceCard className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted leading-snug">
          Reset warm-up and cool-down from Settings defaults and this day&apos;s focus.
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={rebuildWorkoutStretches}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
        >
          Rebuild stretch lists
        </button>
      </SurfaceCard>

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

      <div className="rounded-xl border border-border bg-surface px-4 py-3 space-y-2">
        <p className="text-xs text-muted">
          Discard unsaved edits and restore this day&apos;s auto-generated workout.
        </p>
        {resetConfirm ? (
          <div className="flex flex-wrap gap-2 pt-1">
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

      <CategoryPickModal
        open={categoryPickRound !== null}
        title="Choose category"
        hint="Any training category — respects your equipment and dislikes."
        categories={ROUND_ADD_CATEGORIES}
        onClose={() => setCategoryPickRound(null)}
        onPick={(category) => {
          if (categoryPickRound === null) return;
          openPickModal({ kind: "add", roundIndex: categoryPickRound, category });
          setCategoryPickRound(null);
        }}
      />

      <SwapExerciseModal
        open={pickTarget !== null}
        plannedName={plannedNameForModal}
        candidates={pickCandidates}
        laterRoundByExerciseId={laterRoundByExerciseIdForSwap}
        hasSwap={pickTarget?.kind === "swap"}
        onClose={() => setPickTarget(null)}
        onPick={applyPick}
        onClearSwap={() => {
          if (pickTarget?.kind !== "swap") return;
          const original = initialPlan.rounds[pickTarget.roundIndex]?.exercises[
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
