"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import CardioActivityPickList from "@/components/workout/CardioActivityPickList";
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

const SHORTCUT_KINDS: CardioActivityKind[] = ["walk", "jog"];

type QuickLogModal =
  | null
  | { step: "pick" }
  | { step: "log"; kind: CardioActivityKind };

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
  const [modal, setModal] = useState<QuickLogModal>(null);
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

  const pickableKinds = useMemo(
    () =>
      CARDIO_ACTIVITY_ORDER.filter((kind) =>
        cardioKindAllowed(kind, availableEquipment),
      ),
    [availableEquipment],
  );

  const pendingKind = modal?.step === "log" ? modal.kind : null;

  const resetLogFields = useCallback(() => {
    setDistanceInput("");
    setTimeInput("");
    setHealthMeta(undefined);
    setActivityWindow(null);
    setResolution(null);
    setGpsTrack(undefined);
  }, []);

  const closeLogModal = useCallback(() => {
    setModal(null);
    resetLogFields();
  }, [resetLogFields]);

  function openLogForm(kind: CardioActivityKind) {
    if (modal?.step === "log" && modal.kind !== kind) {
      resetLogFields();
    }
    setModal({ step: "log", kind });
  }

  function openActivityPicker() {
    resetLogFields();
    setModal({ step: "pick" });
  }

  function goToPickStep() {
    resetLogFields();
    setModal({ step: "pick" });
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

  const modalTitle =
    modal?.step === "pick"
      ? "Log activity"
      : pendingKind
        ? `Log ${CARDIO_ACTIVITY_LABELS[pendingKind].toLowerCase()}`
        : "";

  const modalHint =
    modal?.step === "pick"
      ? "Choose an activity to record distance and time."
      : "Start and end your activity, then confirm distance and time.";

  return (
    <>
      <SurfaceCard className="flex flex-col p-4 gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Log activity
          </h2>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            Walk, jog, or choose another activity for today&apos;s workout.
          </p>
        </div>
        <div
          className="grid grid-cols-3 gap-2"
          role="group"
          aria-label="Quick log activity"
        >
          {SHORTCUT_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              disabled={!cardioKindAllowed(kind, availableEquipment)}
              onClick={() => openLogForm(kind)}
              className={`${tileClass} disabled:opacity-40`}
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
            disabled={pickableKinds.length === 0}
            onClick={openActivityPicker}
            className={`${tileClass} disabled:opacity-40`}
            aria-label="Log activity"
          >
            <span className="text-xl text-muted" aria-hidden>
              +
            </span>
            <span className="text-caption font-medium text-foreground">
              Log activity
            </span>
          </button>
        </div>
      </SurfaceCard>

      <BottomSheetModal
        open={modal != null}
        onClose={closeLogModal}
        title={modalTitle}
        hint={modalHint}
        ariaLabel={modalTitle}
        placement="center"
        initialFocus="none"
        headerExtra={
          modal?.step === "log" ? (
            <div className="shrink-0 border-b border-border px-4 py-2">
              <button
                type="button"
                onClick={goToPickStep}
                disabled={saving}
                className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
              >
                ← Change activity
              </button>
            </div>
          ) : undefined
        }
        bodyClassName={
          modal?.step === "pick"
            ? "overflow-y-auto px-2 py-3 max-h-[min(60vh,420px)]"
            : "px-0"
        }
        footer={
          modal?.step === "log" ? (
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
          ) : undefined
        }
      >
        {modal?.step === "pick" ? (
          <CardioActivityPickList
            kinds={pickableKinds}
            onPick={openLogForm}
          />
        ) : null}
        {modal?.step === "log" && pendingKind ? (
          <div className="flex flex-col gap-3 p-4">
            <CardioActivityLogFields
              kind={pendingKind}
              distanceInput={distanceInput}
              timeInput={timeInput}
              onDistanceInputChange={setDistanceInput}
              onTimeInputChange={setTimeInput}
              healthMeta={healthMeta}
              onResolved={applyResolved}
            />
            {hasRenderableGpsRoute(gpsTrack) ? (
              <GpsRouteMap
                points={gpsTrack!}
                ariaLabel={`${modalTitle} GPS route`}
              />
            ) : null}
          </div>
        ) : null}
      </BottomSheetModal>
    </>
  );
}
