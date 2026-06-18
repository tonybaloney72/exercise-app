"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import {
  computeGpsTrackSnapshot,
  formatGpsTrackDuration,
  GpsTrackSession,
} from "@/lib/geo/gpsTrackSession";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { clientTrace } from "@/lib/diagnostics/clientTrace";

type Props = {
  onComplete: (result: {
    distanceMi?: number;
    durationSeconds: number;
    startDate: Date;
    endDate: Date;
  }) => void;
};

type TrackerPhase = "idle" | "acquiring" | "ready" | "recording";

export default function CardioGpsTracker({ onComplete }: Props) {
  const sessionRef = useRef<GpsTrackSession | null>(null);
  const [phase, setPhase] = useState<TrackerPhase>("idle");
  const [readyModalOpen, setReadyModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const native = isNativePlatform();

  useEffect(() => {
    if (phase !== "recording") return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const snapshot = useMemo(() => {
    void tick;
    const session = sessionRef.current;
    if (!session?.isRecording) return null;
    const startedAt = session.getStartedAtMs();
    if (startedAt == null) return null;
    return computeGpsTrackSnapshot(session.getPoints(), startedAt);
  }, [tick, phase]);

  useEffect(() => {
    return () => {
      void sessionRef.current?.dispose();
    };
  }, []);

  if (!native) return null;

  const readyPromptedRef = useRef(false);

  async function handlePrepare() {
    setError(null);
    readyPromptedRef.current = false;
    const session = new GpsTrackSession();
    sessionRef.current = session;
    setPhase("acquiring");
    clientTrace("gps-tracker", "prepare_start");
    try {
      await session.prepare((position, watchError) => {
        if (watchError || !position || readyPromptedRef.current) return;
        if (session.getPhase() !== "watching") return;
        readyPromptedRef.current = true;
        clientTrace("gps-tracker", "gps_ready");
        setPhase("ready");
        setReadyModalOpen(true);
      });
      clientTrace("gps-tracker", "prepare_watch_started");
    } catch (err) {
      sessionRef.current = null;
      setPhase("idle");
      clientTrace(
        "gps-tracker",
        "prepare_error",
        { message: err instanceof Error ? err.message : String(err) },
        "error",
      );
      setError(
        err instanceof Error ? err.message : "Could not start GPS tracking.",
      );
    }
  }

  function handleBeginWalk() {
    const session = sessionRef.current;
    if (!session) return;
    try {
      session.beginRecording();
      clientTrace("gps-tracker", "recording_started");
      setReadyModalOpen(false);
      setPhase("recording");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start the walk timer.",
      );
    }
  }

  async function handleCancel() {
    await sessionRef.current?.dispose();
    sessionRef.current = null;
    readyPromptedRef.current = false;
    setReadyModalOpen(false);
    setPhase("idle");
    setError(null);
  }

  async function handleStop() {
    const session = sessionRef.current;
    if (!session) return;
    const result = await session.stop();
    sessionRef.current = null;
    setPhase("idle");
    setReadyModalOpen(false);
    if (!result || result.pointCount < 2) {
      setError("Need a bit more movement before saving a GPS track.");
      return;
    }
    onComplete({
      distanceMi: result.distanceMi > 0 ? result.distanceMi : undefined,
      durationSeconds: result.durationSeconds,
      startDate: result.startDate,
      endDate: result.endDate,
    });
    clientTrace("gps-tracker", "stop_complete", {
      distanceMi: result.distanceMi,
      durationSeconds: result.durationSeconds,
      pointCount: result.pointCount,
    });
  }

  const statusLine =
    phase === "acquiring"
      ? "Acquiring GPS signal…"
      : phase === "recording" && snapshot
        ? `${formatGpsTrackDuration(snapshot.durationSeconds)}${
            snapshot.distanceMi > 0
              ? ` · ${snapshot.distanceMi} mi`
              : " · tracking…"
          }`
        : null;

  return (
    <>
      <div className="flex flex-col rounded-xl border border-border bg-surface-hover/60 p-3 gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">Track with GPS</p>
            <p className="text-xs text-muted mt-0.5">
              {phase === "idle"
                ? "Get a GPS signal first, then start your walk when ready."
                : "Distance and time count only after you start the walk."}
            </p>
          </div>
          {phase === "recording" ? (
            <button
              type="button"
              onClick={() => void handleStop()}
              className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
            >
              Stop
            </button>
          ) : phase === "idle" ? (
            <button
              type="button"
              onClick={() => void handlePrepare()}
              className="shrink-0 rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent"
            >
              Start
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleCancel()}
              className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted"
            >
              Cancel
            </button>
          )}
        </div>
        {statusLine ? (
          <p className="text-xs text-muted tabular-nums">{statusLine}</p>
        ) : null}
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>

      <BottomSheetModal
        open={readyModalOpen}
        onClose={() => void handleCancel()}
        title="GPS ready"
        hint="Start the timer when you begin walking."
        ariaLabel="GPS ready"
        placement="center"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleCancel()}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBeginWalk}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white hover:bg-accent/90"
            >
              Start walk
            </button>
          </div>
        }
      >
        <p className="px-4 py-3 text-sm text-muted leading-relaxed">
          Location is locked in. Tap <span className="font-medium text-foreground">Start walk</span> when you&apos;re actually moving — the timer and distance won&apos;t include GPS warm-up time.
        </p>
      </BottomSheetModal>
    </>
  );
}
