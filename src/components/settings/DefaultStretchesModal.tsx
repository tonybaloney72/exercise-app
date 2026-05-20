"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import StretchPlanSection from "@/components/workout/StretchPlanSection";
import StretchPickModal from "@/components/workout/StretchPickModal";
import { exerciseMap } from "@/data/exercises";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { getStretchCandidates } from "@/lib/planStretchCandidates";
import {
  buildStretchUsedExerciseIds,
  cloneStretchEntries,
  normalizeStretchList,
  pruneStoredStretchDefaults,
} from "@/lib/stretchDefaults";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { StretchEntry } from "@/types";

type StretchListKey = "defaultWarmUp" | "defaultCoolDown";

type PickTarget =
  | { list: StretchListKey; index?: number }
  | null;

interface DefaultStretchesModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DefaultStretchesModal({ open, onClose }: DefaultStretchesModalProps) {
  const settings = useSettingsStore();
  const prefs = useExercisePreferencesStore((s) => s.byExerciseId);
  const dislikedIds = useMemo(() => collectDislikedIds(prefs), [prefs]);

  const [draftWarmUp, setDraftWarmUp] = useState<StretchEntry[]>([]);
  const [draftCoolDown, setDraftCoolDown] = useState<StretchEntry[]>([]);
  const [pickTarget, setPickTarget] = useState<PickTarget>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetDraft = useCallback(() => {
    const { defaultWarmUp, defaultCoolDown } = pruneStoredStretchDefaults(
      settings.defaultWarmUp,
      settings.defaultCoolDown,
      dislikedIds,
    );
    setDraftWarmUp(cloneStretchEntries(defaultWarmUp));
    setDraftCoolDown(cloneStretchEntries(defaultCoolDown));
    setError(null);
  }, [settings.defaultWarmUp, settings.defaultCoolDown, dislikedIds]);

  useEffect(() => {
    if (open) resetDraft();
  }, [open, resetDraft]);

  const pickCategory = (list: StretchListKey): "SW" | "SC" =>
    list === "defaultCoolDown" ? "SC" : "SW";

  const pickCandidates = useMemo(() => {
    if (!pickTarget) return [];
    const list = pickTarget.list === "defaultWarmUp" ? draftWarmUp : draftCoolDown;
    const used = buildStretchUsedExerciseIds(list, pickTarget.index);
    return getStretchCandidates({
      category: pickCategory(pickTarget.list),
      usedExerciseIds: used,
      availableEquipment: settings.availableEquipment,
      dislikedExerciseIds: dislikedIds,
      exercisePreferences: prefs,
    });
  }, [
    pickTarget,
    draftWarmUp,
    draftCoolDown,
    settings.availableEquipment,
    dislikedIds,
  ]);

  const applyPick = (exerciseId: string) => {
    if (!pickTarget) return;
    const meta = exerciseMap[exerciseId];
    if (!meta) return;
    const entry: StretchEntry = {
      exerciseId: meta.id,
      targetReps: meta.defaultReps,
    };
    const setter =
      pickTarget.list === "defaultWarmUp" ? setDraftWarmUp : setDraftCoolDown;
    setter((prev) => {
      const next = [...prev];
      if (pickTarget.index != null) {
        next[pickTarget.index] = entry;
      } else {
        next.push(entry);
      }
      return next;
    });
    setPickTarget(null);
  };

  const updateTarget = (list: StretchListKey, index: number, targetReps: string) => {
    const setter = list === "defaultWarmUp" ? setDraftWarmUp : setDraftCoolDown;
    setter((prev) => {
      const next = [...prev];
      const row = next[index];
      if (!row) return prev;
      next[index] = { ...row, targetReps };
      return next;
    });
  };

  const removeStretch = (list: StretchListKey, index: number) => {
    const setter = list === "defaultWarmUp" ? setDraftWarmUp : setDraftCoolDown;
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const defaultWarmUp = normalizeStretchList(draftWarmUp, dislikedIds);
      const defaultCoolDown = normalizeStretchList(draftCoolDown, dislikedIds);
      await settings.updateSettings({ defaultWarmUp, defaultCoolDown });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save stretch defaults");
    } finally {
      setSaving(false);
    }
  }

  const plannedName =
    pickTarget?.index != null
      ? exerciseMap[
          (pickTarget.list === "defaultWarmUp" ? draftWarmUp : draftCoolDown)[
            pickTarget.index
          ]?.exerciseId ?? ""
        ]?.name ?? "Stretch"
      : pickTarget?.list === "defaultCoolDown"
        ? "Cool-down stretch"
        : "Warm-up stretch";

  return (
    <>
      <BottomSheetModal
        open={open}
        onClose={onClose}
        title="Default stretches"
        hint="These are merged first into each day's lists. Disliked exercises are hidden here and removed when you save."
        ariaLabel="Default stretches"
        maxWidth="lg"
        bodyClassName="overflow-y-auto px-4 py-4 space-y-4"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save defaults"}
            </button>
          </div>
        }
      >
        <StretchPlanSection
          title="Always include — warm-up"
          hint="Merged first into each day's warm-up (before focus-based additions)."
          entries={draftWarmUp}
          onAdd={() => setPickTarget({ list: "defaultWarmUp" })}
          onChange={(index) => setPickTarget({ list: "defaultWarmUp", index })}
          onRemove={(index) => removeStretch("defaultWarmUp", index)}
          onUpdateTarget={(index, target) =>
            updateTarget("defaultWarmUp", index, target)
          }
        />
        <StretchPlanSection
          title="Always include — cool-down"
          hint="Merged first into each day's cool-down."
          entries={draftCoolDown}
          onAdd={() => setPickTarget({ list: "defaultCoolDown" })}
          onChange={(index) => setPickTarget({ list: "defaultCoolDown", index })}
          onRemove={(index) => removeStretch("defaultCoolDown", index)}
          onUpdateTarget={(index, target) =>
            updateTarget("defaultCoolDown", index, target)
          }
        />
        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </BottomSheetModal>

      <StretchPickModal
        open={pickTarget !== null}
        title={
          pickTarget?.list === "defaultCoolDown"
            ? "Choose cool-down stretch"
            : "Choose warm-up stretch"
        }
        hint="Saved defaults are merged into each day's stretch lists."
        plannedName={plannedName}
        candidates={pickCandidates}
        hasSwap={pickTarget?.index != null}
        onClose={() => setPickTarget(null)}
        onPick={applyPick}
      />
    </>
  );
}
