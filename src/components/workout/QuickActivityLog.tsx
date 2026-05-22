"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import SurfaceCard from "@/components/common/SurfaceCard";
import {
  CARDIO_ACTIVITY_EMOJI,
  CARDIO_ACTIVITY_LABELS,
  CARDIO_ACTIVITY_ORDER,
  cardioKindAllowed,
} from "@/lib/cardioActivities";
import { parseTimeInput } from "@/utils/time";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import type { CardioActivityKind, DayPlan } from "@/types";

type Props = {
  plan: DayPlan;
  dateKey: string;
};

export default function QuickActivityLog({ plan, dateKey }: Props) {
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const quickLogCardio = useWorkoutStore((s) => s.quickLogCardio);
  const [pendingKind, setPendingKind] = useState<CardioActivityKind | null>(
    null,
  );
  const [distanceInput, setDistanceInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [saving, setSaving] = useState(false);

  const closeModal = useCallback(() => {
    setPendingKind(null);
    setDistanceInput("");
    setTimeInput("");
  }, []);

  async function handleSave() {
    if (!pendingKind) return;
    const distanceMi = distanceInput.trim()
      ? parseFloat(distanceInput.trim())
      : undefined;
    const durationSeconds = timeInput.trim()
      ? parseTimeInput(timeInput.trim())
      : undefined;
    const hasDistance =
      distanceMi != null && !Number.isNaN(distanceMi) && distanceMi > 0;
    const hasDuration = durationSeconds != null && durationSeconds > 0;
    if (!hasDistance && !hasDuration) {
      toast.error("Enter distance and/or time.");
      return;
    }

    setSaving(true);
    const ok = await quickLogCardio(plan, dateKey, pendingKind, {
      distanceMi: hasDistance ? distanceMi : undefined,
      durationSeconds: hasDuration ? durationSeconds : undefined,
    });
    setSaving(false);
    if (ok) {
      toast.success(`${CARDIO_ACTIVITY_LABELS[pendingKind]} logged`);
      closeModal();
    }
  }

  const modalTitle = pendingKind
    ? `Log ${CARDIO_ACTIVITY_LABELS[pendingKind].toLowerCase()}`
    : "";

  return (
    <>
      <SurfaceCard className="p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Log activity
          </h2>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            Add a walk, jog, or other cardio to today&apos;s workout.
          </p>
        </div>
        <div
          className="flex flex-wrap gap-2 justify-center"
          role="group"
          aria-label="Quick log activity"
        >
          {CARDIO_ACTIVITY_ORDER.map((kind) => {
            const allowed = cardioKindAllowed(kind, availableEquipment);
            return (
              <button
                key={kind}
                type="button"
                disabled={!allowed}
                title={
                  allowed
                    ? CARDIO_ACTIVITY_LABELS[kind]
                    : `${CARDIO_ACTIVITY_LABELS[kind]} requires equipment in Settings`
                }
                onClick={() => setPendingKind(kind)}
                className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface-hover px-3 py-2.5 min-w-18 transition-colors hover:border-accent/40 disabled:opacity-40 disabled:hover:border-border"
              >
                <span className="text-xl" aria-hidden>
                  {CARDIO_ACTIVITY_EMOJI[kind]}
                </span>
                <span className="text-[10px] font-medium text-foreground">
                  {CARDIO_ACTIVITY_LABELS[kind]}
                </span>
              </button>
            );
          })}
        </div>
      </SurfaceCard>

      <BottomSheetModal
        open={pendingKind != null}
        onClose={closeModal}
        title={modalTitle}
        hint="Distance and/or time required."
        ariaLabel={modalTitle}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white hover:bg-accent/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <div className="space-y-3 px-1">
          <label className="block">
            <span className="text-[10px] text-muted uppercase tracking-wider">
              Distance (mi)
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={distanceInput}
              onChange={(e) => setDistanceInput(e.target.value)}
              placeholder="1.2"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-muted uppercase tracking-wider">
              Time (MM:SS or minutes)
            </span>
            <input
              type="text"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              placeholder="32:00"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>
        </div>
      </BottomSheetModal>
    </>
  );
}
