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
import { parseTimeInput } from "@/utils/time";
import CardioActivityLogFields, {
  applyResolvedCardioQuickLog,
} from "@/components/workout/CardioActivityLogFields";
import type { CardioHealthMeta } from "@/lib/health";
import { mirrorCardioCaptureToHealth } from "@/lib/mirrorCardioToHealth";
import { getWeightForDate } from "@/lib/weightLog";
import type { ResolvedCardioQuickLog } from "@/lib/health/resolveCardioQuickLog";
import type { GpsTrackPoint } from "@/lib/geo/gpsTrackSession";
import { hasRenderableGpsRoute } from "@/lib/geo/gpsTrackPolyline";
import GpsRouteMap from "@/components/cardio/GpsRouteMap";
import { clientTrace } from "@/lib/diagnostics/clientTrace";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useWeightStore } from "@/stores/useWeightStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import type { CardioActivityKind, DayPlan } from "@/types";

const PRIMARY_KINDS: CardioActivityKind[] = ["walk", "jog"];

type Props = {
  plan: DayPlan;
  dateKey: string;
};

const tileClass =
  "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface-hover px-2 py-3 min-h-[4.25rem] transition-colors hover:border-accent/40";

export default function QuickActivityLog({ plan, dateKey }: Props) {
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const weightEntries = useWeightStore((s) => s.entries);
  const quickLogCardio = useWorkoutStore((s) => s.quickLogCardio);
  const [pendingKind, setPendingKind] = useState<CardioActivityKind | null>(
    null,
  );
  const [morePickerOpen, setMorePickerOpen] = useState(false);
  const [distanceInput, setDistanceInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [healthMeta, setHealthMeta] = useState<CardioHealthMeta | undefined>();
  const [activityWindow, setActivityWindow] = useState<{
    startDate: Date;
    endDate: Date;
  } | null>(null);
  const [resolution, setResolution] = useState<
    ResolvedCardioQuickLog["resolution"] | null
  >(null);
  const [gpsTrack, setGpsTrack] = useState<readonly GpsTrackPoint[] | undefined>();
  const [saving, setSaving] = useState(false);

  const moreKinds = useMemo(
    () =>
      CARDIO_ACTIVITY_ORDER.filter(
        (kind) =>
          !PRIMARY_KINDS.includes(kind) &&
          cardioKindAllowed(kind, availableEquipment),
      ),
    [availableEquipment],
  );

  const closeLogModal = useCallback(() => {
    setPendingKind(null);
    setDistanceInput("");
    setTimeInput("");
    setHealthMeta(undefined);
    setActivityWindow(null);
    setResolution(null);
    setGpsTrack(undefined);
  }, []);

  function openLogForm(kind: CardioActivityKind) {
    setMorePickerOpen(false);
    setPendingKind(kind);
  }

  function applyResolved(result: ResolvedCardioQuickLog) {
    applyResolvedCardioQuickLog({
      result,
      setDistanceInput,
      setTimeInput,
      setHealthMeta,
      setActivityWindow,
      setResolution,
      setGpsTrack,
    });
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
    clientTrace("cardio-save", "save_click", {
      kind: pendingKind,
      hasActivityWindow: Boolean(activityWindow),
      hasDistance,
      hasDuration,
      healthSource: healthMeta?.source,
      resolution,
    });
    try {
      const resolvedHealth = healthMeta;
      clientTrace("cardio-save", "quickLog_invoke", {
        healthSource: resolvedHealth?.source,
        stepCount: resolvedHealth?.stepCount,
        resolution,
      });
      const ok = await quickLogCardio(plan, dateKey, pendingKind, {
        distanceMi: hasDistance ? distanceMi : undefined,
        durationSeconds: hasDuration ? durationSeconds : undefined,
        health: resolvedHealth,
        gpsTrackPoints: gpsTrack,
        activityStartTime: activityWindow?.startDate.toISOString(),
        activityEndTime: activityWindow?.endDate.toISOString(),
      });
      clientTrace("cardio-save", ok ? "quickLog_ok" : "quickLog_failed");
      if (ok && pendingKind) {
        const weightLb = getWeightForDate(weightEntries, dateKey)?.weightLb;
        void mirrorCardioCaptureToHealth({
          kind: pendingKind,
          distanceMi: hasDistance ? distanceMi : undefined,
          durationSeconds: hasDuration ? durationSeconds : undefined,
          activeCaloriesKcal: healthMeta?.activeCaloriesKcal,
          activityStartTime: activityWindow?.startDate.toISOString(),
          activityEndTime: activityWindow?.endDate.toISOString(),
          weightLb,
          healthSource: healthMeta?.source,
          resolution,
        }).catch(() => {
          // Optional mirror to Health Connect; logging in-app already succeeded.
        });
      }
      if (ok) {
        toast.success(`${CARDIO_ACTIVITY_LABELS[pendingKind]} logged`);
        closeLogModal();
      }
    } finally {
      setSaving(false);
    }
  }

  const modalTitle = pendingKind
    ? `Log ${CARDIO_ACTIVITY_LABELS[pendingKind].toLowerCase()}`
    : "";

  return (
    <>
      <SurfaceCard className="flex flex-col p-4 gap-3">
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
            <span className="text-caption font-medium text-foreground">
              More
            </span>
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
        hint="Start and end your activity, then confirm distance and time."
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
        <div className="flex flex-col gap-3 p-4">
          {pendingKind ? (
            <CardioActivityLogFields
              kind={pendingKind}
              distanceInput={distanceInput}
              timeInput={timeInput}
              onDistanceInputChange={setDistanceInput}
              onTimeInputChange={setTimeInput}
              healthMeta={healthMeta}
              onResolved={applyResolved}
            />
          ) : null}
          {hasRenderableGpsRoute(gpsTrack) ? (
            <GpsRouteMap
              points={gpsTrack!}
              ariaLabel={`${modalTitle} GPS route`}
            />
          ) : null}
        </div>
      </BottomSheetModal>
    </>
  );
}
