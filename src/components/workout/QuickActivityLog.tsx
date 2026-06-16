"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import CardioActivityPickModal from "@/components/workout/CardioActivityPickModal";
import SurfaceCard from "@/components/common/SurfaceCard";
import {
  CARDIO_ACTIVITY_EMOJI,
  CARDIO_ACTIVITY_LABELS,
  CARDIO_ACTIVITY_ORDER,
  cardioKindAllowed,
} from "@/lib/cardioActivities";
import { formatSecondsToMMSS, parseTimeInput } from "@/utils/time";
import CardioGpsTracker from "@/components/workout/CardioGpsTracker";
import CardioHealthImport from "@/components/workout/CardioHealthImport";
import {
  writeCardioSessionToHealth,
  type CardioHealthMeta,
  type ImportedCardioSession,
} from "@/lib/health";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import type { CardioActivityKind, DayPlan } from "@/types";

const PRIMARY_KINDS: CardioActivityKind[] = ["walk", "jog"];

const GPS_KINDS: CardioActivityKind[] = ["walk", "jog"];

type Props = {
  plan: DayPlan;
  dateKey: string;
};

const tileClass =
  "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface-hover px-2 py-3 min-h-[4.25rem] transition-colors hover:border-accent/40";

export default function QuickActivityLog({ plan, dateKey }: Props) {
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const quickLogCardio = useWorkoutStore((s) => s.quickLogCardio);
  const [pendingKind, setPendingKind] = useState<CardioActivityKind | null>(
    null,
  );
  const [morePickerOpen, setMorePickerOpen] = useState(false);
  const [distanceInput, setDistanceInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [healthMeta, setHealthMeta] = useState<CardioHealthMeta | undefined>();
  const [gpsSession, setGpsSession] = useState<{
    startDate: Date;
    endDate: Date;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const moreKinds = useMemo(
    () =>
      CARDIO_ACTIVITY_ORDER.filter(
        (kind) =>
          !PRIMARY_KINDS.includes(kind) &&
          (kind !== "cycle" || cardioKindAllowed("cycle", availableEquipment)),
      ),
    [availableEquipment],
  );

  const closeLogModal = useCallback(() => {
    setPendingKind(null);
    setDistanceInput("");
    setTimeInput("");
    setHealthMeta(undefined);
    setGpsSession(null);
  }, []);

  function openLogForm(kind: CardioActivityKind) {
    setMorePickerOpen(false);
    setPendingKind(kind);
  }

  function applyImportedSession(session: ImportedCardioSession) {
    if (session.distanceMi != null) {
      setDistanceInput(String(session.distanceMi));
    }
    setTimeInput(formatSecondsToMMSS(session.durationSeconds));
    setHealthMeta({
      activeCaloriesKcal: session.activeCaloriesKcal,
      avgHeartRateBpm: session.avgHeartRateBpm,
      source: "health_connect",
    });
    setGpsSession({ startDate: session.startDate, endDate: session.endDate });
  }

  function applyGpsTrack(result: {
    distanceMi?: number;
    durationSeconds: number;
    startDate: Date;
    endDate: Date;
  }) {
    if (result.distanceMi != null) {
      setDistanceInput(String(result.distanceMi));
    }
    setTimeInput(formatSecondsToMMSS(result.durationSeconds));
    setHealthMeta((prev) => ({ ...prev, source: "gps" }));
    setGpsSession({ startDate: result.startDate, endDate: result.endDate });
  }

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
      health: healthMeta,
    });
    if (ok && isNativePlatform() && gpsSession && healthMeta?.source === "gps") {
      void writeCardioSessionToHealth({
        distanceMi: hasDistance ? distanceMi : undefined,
        durationSeconds: hasDuration ? durationSeconds! : 0,
        activeCaloriesKcal: healthMeta?.activeCaloriesKcal,
        startDate: gpsSession.startDate,
        endDate: gpsSession.endDate,
      }).catch(() => {
        // Optional mirror to Health Connect; logging in-app already succeeded.
      });
    }
    setSaving(false);
    if (ok) {
      toast.success(`${CARDIO_ACTIVITY_LABELS[pendingKind]} logged`);
      closeLogModal();
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
            Walk, jog, or pick another activity for today&apos;s workout.
          </p>
        </div>
        <div
          className="grid grid-cols-3 gap-2"
          role="group"
          aria-label="Quick log activity"
        >
          {PRIMARY_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => openLogForm(kind)}
              className={tileClass}
            >
              <span className="text-xl" aria-hidden>
                {CARDIO_ACTIVITY_EMOJI[kind]}
              </span>
              <span className="text-caption font-medium text-foreground">
                {CARDIO_ACTIVITY_LABELS[kind]}
              </span>
            </button>
          ))}
          <button
            type="button"
            disabled={moreKinds.length === 0}
            onClick={() => setMorePickerOpen(true)}
            className={`${tileClass} disabled:opacity-40`}
            aria-label="More activities"
          >
            <span className="text-xl text-muted" aria-hidden>
              ⋯
            </span>
            <span className="text-caption font-medium text-foreground">More</span>
          </button>
        </div>
      </SurfaceCard>

      <CardioActivityPickModal
        open={morePickerOpen}
        onClose={() => setMorePickerOpen(false)}
        onPick={openLogForm}
        kinds={moreKinds}
        title="Other activities"
        hint="Hike, swim, and more."
        placement="center"
      />

      <BottomSheetModal
        open={pendingKind != null}
        onClose={closeLogModal}
        title={modalTitle}
        hint="Distance and/or time required."
        ariaLabel={modalTitle}
        placement="center"
        initialFocus="none"
        bodyClassName="px-0"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeLogModal}
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
        <div className="space-y-3 px-4 py-1">
          {pendingKind && GPS_KINDS.includes(pendingKind) ? (
            <CardioGpsTracker onComplete={applyGpsTrack} />
          ) : null}
          {pendingKind ? (
            <CardioHealthImport kind={pendingKind} onImport={applyImportedSession} />
          ) : null}
          <label className="block">
            <span className="text-caption text-muted uppercase tracking-wider">
              Distance (mi)
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={distanceInput}
              onChange={(e) => setDistanceInput(e.target.value)}
              onFocus={(e) =>
                e.currentTarget.scrollIntoView({
                  block: "nearest",
                  behavior: "smooth",
                })
              }
              placeholder="1.2"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-caption text-muted uppercase tracking-wider">
              Time (MM:SS)
            </span>
            <input
              type="text"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              onFocus={(e) =>
                e.currentTarget.scrollIntoView({
                  block: "nearest",
                  behavior: "smooth",
                })
              }
              placeholder="9:30 or 930"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>
        </div>
      </BottomSheetModal>
    </>
  );
}
