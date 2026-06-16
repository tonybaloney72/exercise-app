"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeGpsTrackSnapshot,
  formatGpsTrackDuration,
  GpsTrackSession,
} from "@/lib/geo/gpsTrackSession";
import { isNativePlatform } from "@/lib/capacitorRuntime";

type Props = {
  onComplete: (result: {
    distanceMi?: number;
    durationSeconds: number;
    startDate: Date;
    endDate: Date;
  }) => void;
};

export default function CardioGpsTracker({ onComplete }: Props) {
  const sessionRef = useRef<GpsTrackSession | null>(null);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const native = isNativePlatform();

  useEffect(() => {
    if (!tracking) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [tracking]);

  const snapshot = useMemo(() => {
    void tick;
    const session = sessionRef.current;
    if (!session?.isTracking) return null;
    const startedAt = session.getStartedAtMs();
    if (startedAt == null) return null;
    return computeGpsTrackSnapshot(session.getPoints(), startedAt);
  }, [tick, tracking]);

  if (!native) return null;

  async function handleStart() {
    setError(null);
    const session = new GpsTrackSession();
    sessionRef.current = session;
    try {
      await session.start();
      setTracking(true);
    } catch (err) {
      sessionRef.current = null;
      setError(err instanceof Error ? err.message : "Could not start GPS tracking.");
    }
  }

  async function handleStop() {
    const session = sessionRef.current;
    if (!session) return;
    const result = await session.stop();
    sessionRef.current = null;
    setTracking(false);
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
  }

  return (
    <div className="rounded-xl border border-border bg-surface-hover/60 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Track with GPS</p>
          <p className="text-xs text-muted mt-0.5">
            Native app only. Distance and time fill in automatically.
          </p>
        </div>
        {tracking ? (
          <button
            type="button"
            onClick={() => void handleStop()}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleStart()}
            className="shrink-0 rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent"
          >
            Start
          </button>
        )}
      </div>
      {tracking && snapshot ? (
        <p className="text-xs text-muted tabular-nums">
          {formatGpsTrackDuration(snapshot.durationSeconds)}
          {snapshot.distanceMi > 0 ? ` · ${snapshot.distanceMi} mi` : " · acquiring GPS…"}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
