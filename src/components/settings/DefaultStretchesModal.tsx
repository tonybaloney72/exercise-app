"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StretchPlanSection from "@/components/workout/StretchPlanSection";
import SwapExerciseModal from "@/components/workout/SwapExerciseModal";
import { exerciseMap } from "@/data/exercises";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { getStretchCandidates } from "@/lib/planStretchCandidates";
import { pickRandomSwap } from "@/lib/exerciseSwap";
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
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Default stretches"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2 shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Default stretches</h2>
                <p className="text-[11px] text-muted mt-0.5">
                  These are merged first into each day&apos;s lists. Disliked exercises are
                  hidden here and removed when you save.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-muted hover:bg-surface-hover hover:text-foreground"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </motion.div>

            <motion.div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
            </motion.div>

            <motion.div className="border-t border-border px-4 py-3 flex gap-2 shrink-0">
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
            </motion.div>

            <SwapExerciseModal
              open={pickTarget !== null}
              plannedName={plannedName}
              candidates={pickCandidates}
              hasSwap={pickTarget?.index != null}
              onClose={() => setPickTarget(null)}
              onPick={applyPick}
              onRandom={() => {
                const picked = pickRandomSwap(pickCandidates);
                if (picked) applyPick(picked.id);
              }}
              onClearSwap={() => {}}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
