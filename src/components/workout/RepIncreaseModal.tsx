"use client";

import { useMemo, useState } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import {
  buildExerciseSettingsAfterRepIncreaseAccept,
  buildExerciseSettingsAfterRepIncreaseIgnore,
  buildExerciseSettingsAfterRepIncreaseSnooze,
} from "@/lib/applyRepIncreaseSuggestion";
import {
  addDaysToDateKey,
  formatRepIncreaseTarget,
  REP_SUGGESTION_SNOOZE_DAYS,
  type RepIncreaseSuggestion,
} from "@/lib/repIncreaseSuggestions";
import { resolveExerciseDisplayName } from "@/lib/exerciseDisplayName";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { toast } from "sonner";

export type RepIncreaseModalProps = {
  open: boolean;
  suggestions: RepIncreaseSuggestion[];
  todayKey: string;
  onClose: () => void;
  onApplied: () => void;
};

export default function RepIncreaseModal({
  open,
  suggestions,
  todayKey,
  onClose,
  onApplied,
}: RepIncreaseModalProps) {
  const upsert = useExerciseSettingsStore((s) => s.upsert);
  const byExerciseId = useExerciseSettingsStore((s) => s.byExerciseId);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  const selectedIds = useMemo(() => {
    if (selected.size > 0) return selected;
    return new Set(suggestions.map((s) => s.exerciseId));
  }, [selected, suggestions]);

  function toggleSelected(exerciseId: string) {
    setSelected((prev) => {
      const base = prev.size > 0 ? prev : new Set(suggestions.map((s) => s.exerciseId));
      const next = new Set(base);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
  }

  async function applySelected() {
    const toApply = suggestions.filter((s) => selectedIds.has(s.exerciseId));
    if (toApply.length === 0) return;
    setBusy(true);
    try {
      await Promise.all(
        toApply.map((suggestion) =>
          upsert(
            suggestion.exerciseId,
            buildExerciseSettingsAfterRepIncreaseAccept(
              suggestion.exerciseId,
              suggestion,
              byExerciseId[suggestion.exerciseId],
              todayKey,
            ),
          ),
        ),
      );
      toast.success(
        toApply.length === 1
          ? "Default updated"
          : `${toApply.length} defaults updated`,
      );
      onApplied();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function snoozeOne(exerciseId: string) {
    const snoozedUntil = addDaysToDateKey(todayKey, REP_SUGGESTION_SNOOZE_DAYS);
    await upsert(
      exerciseId,
      buildExerciseSettingsAfterRepIncreaseSnooze(
        exerciseId,
        byExerciseId[exerciseId],
        snoozedUntil,
      ),
    );
    toast.message("Snoozed for 14 days");
    onApplied();
  }

  async function ignoreOne(exerciseId: string) {
    await upsert(
      exerciseId,
      buildExerciseSettingsAfterRepIncreaseIgnore(
        exerciseId,
        byExerciseId[exerciseId],
      ),
    );
    toast.message("Won't suggest for this exercise");
    onApplied();
  }

  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      title="Update your defaults?"
      hint="Updates your Library defaults for future workouts."
      ariaLabel="Progression suggestions"
      footer={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy || selectedIds.size === 0}
            onClick={() => void applySelected()}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            Update selected
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Not now
          </button>
        </div>
      }
    >
      <ul className="flex flex-col gap-3 px-4 pb-2">
        {suggestions.map((suggestion) => {
          const checked = selectedIds.has(suggestion.exerciseId);
          const name = resolveExerciseDisplayName(suggestion.exerciseId);
          return (
            <li
              key={suggestion.exerciseId}
              className="rounded-xl border border-border bg-surface-hover p-3"
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSelected(suggestion.exerciseId)}
                  className="mt-1 h-4 w-4 accent-accent"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">
                    {name}
                  </span>
                  <span className="text-sm text-foreground">
                    {formatRepIncreaseTarget(
                      suggestion.mode,
                      suggestion.currentTarget,
                      suggestion.currentWeightLb,
                    )}{" "}
                    →{" "}
                    {formatRepIncreaseTarget(
                      suggestion.mode,
                      suggestion.suggestedTarget,
                      suggestion.suggestedWeightLb ??
                        suggestion.currentWeightLb,
                    )}
                  </span>
                  <span className="text-xs text-muted">{suggestion.reason}</span>
                </span>
              </label>
              <div className="mt-2 flex flex-wrap gap-2 pl-7">
                <button
                  type="button"
                  onClick={() => void snoozeOne(suggestion.exerciseId)}
                  className="text-xs font-medium text-muted hover:text-foreground"
                >
                  Snooze 14 days
                </button>
                <button
                  type="button"
                  onClick={() => void ignoreOne(suggestion.exerciseId)}
                  className="text-xs font-medium text-muted hover:text-foreground"
                >
                  Don&apos;t suggest
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </BottomSheetModal>
  );
}
