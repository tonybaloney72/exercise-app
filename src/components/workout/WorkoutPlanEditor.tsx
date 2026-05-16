"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import CategoryBadge from "@/components/common/CategoryBadge";
import CategoryPickModal from "@/components/workout/CategoryPickModal";
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
import { pickRandomSwap } from "@/lib/exerciseSwap";
import { prepareDayPlanForEditor } from "@/lib/trainingWeekCustomize";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { DayPlan, ExerciseCategory, RoundExercise, StretchEntry } from "@/types";

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

interface WorkoutPlanEditorProps {
  initialPlan: DayPlan;
  isCustomWeek: boolean;
  saving: boolean;
  onSave: (plan: DayPlan) => void;
  onCancel: () => void;
  onResetWeek: () => void;
}

export default function WorkoutPlanEditor({
  initialPlan,
  isCustomWeek,
  saving,
  onSave,
  onCancel,
  onResetWeek,
}: WorkoutPlanEditorProps) {
  const [draft, setDraft] = useState(() => prepareDayPlanForEditor(initialPlan));
  const [pickTarget, setPickTarget] = useState<PickTarget | null>(null);
  const [categoryPickRound, setCategoryPickRound] = useState<number | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const prefs = useExercisePreferencesStore((s) => s.byExerciseId);
  const dislikedIds = useMemo(() => collectDislikedIds(prefs), [prefs]);

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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <motion.div className="rounded-xl border border-accent/40 bg-accent/10 p-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-accent">
          Customize workout
        </p>
        <p className="text-sm text-muted">
          Edit this day&apos;s rounds and stretch lists. Default stretches are in Settings.
          Swap keeps the same category; add exercise can use any training category.
          {isCustomWeek
            ? " This week is customized — settings changes won’t overwrite until reset."
            : " Saving marks this week as customized."}
        </p>
      </motion.div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-surface px-4 py-3">
        <p className="text-xs text-muted">
          Rebuild from your Settings defaults plus this day&apos;s focus and rounds.
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={rebuildWorkoutStretches}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
        >
          Rebuild stretch lists
        </button>
      </div>

      <StretchPlanSection
        title="Warm-up for this workout"
        hint="Full list used when you start this day’s workout."
        entries={stretchLists.warmUp}
        onAdd={() => openPickModal({ kind: "stretch", section: "warmUp" })}
        onChange={(index) => openPickModal({ kind: "stretch", section: "warmUp", index })}
        onRemove={(index) => removeStretch("warmUp", index)}
        onUpdateTarget={(index, target) => updateStretchTarget("warmUp", index, target)}
      />

      <StretchPlanSection
        title="Cool-down for this workout"
        hint="Full list used when you finish this day’s workout."
        entries={stretchLists.coolDown}
        onAdd={() => openPickModal({ kind: "stretch", section: "coolDown" })}
        onChange={(index) => openPickModal({ kind: "stretch", section: "coolDown", index })}
        onRemove={(index) => removeStretch("coolDown", index)}
        onUpdateTarget={(index, target) => updateStretchTarget("coolDown", index, target)}
      />

      {draft.rounds.map((round, roundIndex) => (
        <motion.div
          key={round.roundNumber}
          className="rounded-xl border border-border bg-surface overflow-hidden"
        >
          <motion.div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Round {round.roundNumber}
            </h2>
            <button
              type="button"
              onClick={() => setCategoryPickRound(roundIndex)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-hover"
            >
              + Add exercise
            </button>
          </motion.div>
          <motion.div className="divide-y divide-border px-2 py-1">
            {round.exercises.map((slot, slotIndex) => {
              const meta = exerciseMap[slot.exerciseId];
              if (!meta) return null;
              return (
                <motion.div
                  key={`${round.roundNumber}-${slotIndex}-${slot.exerciseId}`}
                  className="px-2 py-3 space-y-2"
                >
                  <motion.div className="flex items-start justify-between gap-2">
                    <motion.div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{meta.name}</p>
                      <CategoryBadge category={meta.category} size="sm" />
                    </motion.div>
                    <motion.div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          openPickModal({ kind: "swap", roundIndex, slotIndex })
                        }
                        className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-hover"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        disabled={round.exercises.length <= 1}
                        onClick={() => removeSlot(roundIndex, slotIndex)}
                        className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted hover:text-foreground hover:bg-surface-hover disabled:opacity-40"
                        aria-label={`Remove ${meta.name}`}
                      >
                        Remove
                      </button>
                    </motion.div>
                  </motion.div>
                  <label className="block">
                    <span className="text-[11px] text-muted">Target</span>
                    <input
                      type="text"
                      value={slot.targetReps}
                      onChange={(e) =>
                        updateReps(roundIndex, slotIndex, e.target.value)
                      }
                      className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </label>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      ))}

      <motion.div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(draft)}
          className="flex-1 rounded-xl bg-accent py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save this day"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="flex-1 rounded-xl border border-border bg-surface py-3.5 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
        >
          Cancel
        </button>
      </motion.div>

      <motion.div className="rounded-xl border border-border bg-surface p-4 space-y-2">
        <p className="text-sm font-medium text-foreground">Reset entire week</p>
        <p className="text-xs text-muted">
          Regenerate Sun–Sat from your settings and remove all custom edits for this week.
        </p>
        {resetConfirm ? (
          <motion.div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setResetConfirm(false);
                onResetWeek();
              }}
              className="rounded-lg bg-red-600/90 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            >
              Yes, reset week
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setResetConfirm(false)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:text-foreground"
            >
              Keep custom plan
            </button>
          </motion.div>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => setResetConfirm(true)}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover disabled:opacity-50"
          >
            Reset week to auto-generated
          </button>
        )}
      </motion.div>

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
        hasSwap={pickTarget?.kind === "swap"}
        onClose={() => setPickTarget(null)}
        onPick={applyPick}
        onRandom={() => {
          const picked = pickRandomSwap(pickCandidates);
          if (picked) applyPick(picked.id);
        }}
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
    </motion.div>
  );
}
