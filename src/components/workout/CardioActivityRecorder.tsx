"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  computeGpsTrackSnapshot,
  formatGpsTrackDuration,
  GpsTrackSession,
} from "@/lib/geo/gpsTrackSession";
import { ensureCardioHealthReadAccess } from "@/lib/health";
import {
  resolveCardioQuickLog,
  resolveCardioQuickLogFromSession,
  type ResolvedCardioQuickLog,
} from "@/lib/health/resolveCardioQuickLog";
import type { ScoredCardioSession } from "@/lib/health/cardioSessionMatch";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { clientTrace } from "@/lib/diagnostics/clientTrace";
import { formatSecondsToMMSS } from "@/utils/time";
import type { CardioActivityKind } from "@/types";

type RecorderPhase = "idle" | "recording" | "resolving" | "pick_session";

type Props = {
  kind: CardioActivityKind;
  onResolved: (result: ResolvedCardioQuickLog) => void;
};

export default function CardioActivityRecorder({ kind, onResolved }: Props) {
  const sessionRef = useRef<GpsTrackSession | null>(null);
  const startDateRef = useRef<Date | null>(null);
  const endDateRef = useRef<Date | null>(null);
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [candidates, setCandidates] = useState<ScoredCardioSession[]>([]);
  const [gpsSnapshot, setGpsSnapshot] = useState<
    ReturnType<typeof computeGpsTrackSnapshot> | null
  >(null);

  const native = isNativePlatform();

  useEffect(() => {
    if (phase !== "recording") return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    return () => {
      void sessionRef.current?.dispose();
    };
  }, []);

  const liveSnapshot = useMemo(() => {
    void tick;
    const startedAt = startDateRef.current?.getTime();
    const session = sessionRef.current;
    if (phase !== "recording" || startedAt == null) return null;
    const points = session?.getPoints() ?? [];
    return computeGpsTrackSnapshot(points, startedAt);
  }, [phase, tick]);

  const finishResolve = useCallback(
    (result: ResolvedCardioQuickLog) => {
      setPhase("idle");
      setCandidates([]);
      setGpsSnapshot(null);
      startDateRef.current = null;
      endDateRef.current = null;
      onResolved(result);
    },
    [onResolved],
  );

  async function handleStart() {
    setError(null);
    setCandidates([]);
    const startedAt = new Date();
    startDateRef.current = startedAt;
    clientTrace("cardio-recorder", "start", { kind });

    if (native) {
      const gps = new GpsTrackSession();
      sessionRef.current = gps;
      try {
        await gps.startImmediate();
      } catch (err) {
        sessionRef.current = null;
        startDateRef.current = null;
        clientTrace(
          "cardio-recorder",
          "gps_start_error",
          { message: err instanceof Error ? err.message : String(err) },
          "warn",
        );
        setError(
          err instanceof Error
            ? err.message
            : "Could not start GPS. Timer will still run.",
        );
        setPhase("recording");
        return;
      }
    }

    setPhase("recording");
  }

  async function handleEnd() {
    const startDate = startDateRef.current;
    if (!startDate) return;

    const endDate = new Date();
    endDateRef.current = endDate;
    setPhase("resolving");
    setError(null);

    let snapshot = gpsSnapshot;
    const gps = sessionRef.current;
    if (gps) {
      const stopped = await gps.stop();
      sessionRef.current = null;
      snapshot = stopped;
      setGpsSnapshot(stopped);
    }

    try {
      await ensureCardioHealthReadAccess();
      const result = await resolveCardioQuickLog({
        kind,
        startDate,
        endDate,
        gpsSnapshot: snapshot,
      });

      if (result.ambiguousSessions && result.ambiguousSessions.length > 0) {
        setCandidates(result.ambiguousSessions);
        setPhase("pick_session");
        return;
      }

      clientTrace("cardio-recorder", "resolved", {
        resolution: result.resolution,
        distanceMi: result.distanceMi,
      });
      finishResolve(result);
    } catch (err) {
      setPhase("recording");
      setError(
        err instanceof Error ? err.message : "Could not read Health Connect.",
      );
    }
  }

  async function handlePickSession(row: ScoredCardioSession) {
    const startDate = startDateRef.current;
    const endDate = endDateRef.current;
    if (!startDate || !endDate) return;
    setPhase("resolving");
    try {
      const result = await resolveCardioQuickLogFromSession({
        kind,
        startDate,
        endDate,
        session: row.session,
        gpsSnapshot,
      });
      finishResolve(result);
    } catch (err) {
      setPhase("pick_session");
      setError(
        err instanceof Error ? err.message : "Could not apply that session.",
      );
    }
  }

  async function handleSkipSessionPick() {
    const startDate = startDateRef.current;
    const endDate = endDateRef.current;
    if (!startDate || !endDate) return;
    setPhase("resolving");
    const result = await resolveCardioQuickLog({
      kind,
      startDate,
      endDate,
      gpsSnapshot,
      preferSamples: true,
    });
    finishResolve(result);
  }

  async function handleCancel() {
    await sessionRef.current?.dispose();
    sessionRef.current = null;
    startDateRef.current = null;
    endDateRef.current = null;
    setGpsSnapshot(null);
    setCandidates([]);
    setPhase("idle");
    setError(null);
  }

  if (!native) {
    return (
      <SimpleTimerRecorder
        onResolved={(startDate, endDate) => {
          onResolved({
            startDate,
            endDate,
            durationSeconds: Math.max(
              1,
              Math.round((endDate.getTime() - startDate.getTime()) / 1000),
            ),
            resolution: "timer_only",
          });
        }}
      />
    );
  }

  const statusLine =
    phase === "recording" && liveSnapshot
      ? `${formatGpsTrackDuration(liveSnapshot.durationSeconds)}${
          liveSnapshot.distanceMi > 0
            ? ` · ${liveSnapshot.distanceMi} mi`
            : " · GPS tracking…"
        }`
      : phase === "resolving"
        ? "Pulling activity from Health Connect…"
        : null;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface-hover/60 p-3 gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Track activity</p>
          <p className="text-xs text-muted mt-0.5">
            {phase === "idle"
              ? "Start records time and GPS. End matches Health Connect and fills distance."
              : phase === "pick_session"
                ? "Pick the Health Connect session that matches this activity."
                : "Timer runs until you tap End."}
          </p>
        </div>
        {phase === "recording" ? (
          <button
            type="button"
            onClick={() => void handleEnd()}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
          >
            End
          </button>
        ) : phase === "idle" ? (
          <button
            type="button"
            onClick={() => void handleStart()}
            className="shrink-0 rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent"
          >
            Start
          </button>
        ) : phase === "pick_session" ? (
          <button
            type="button"
            onClick={() => void handleCancel()}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted"
          >
            Cancel
          </button>
        ) : null}
      </div>

      {statusLine ? (
        <p className="text-xs text-muted tabular-nums">{statusLine}</p>
      ) : null}

      {phase === "pick_session" && candidates.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {candidates.map((row) => {
            const session = row.session;
            const labelParts = [
              session.workoutType ?? "session",
              formatSecondsToMMSS(
                Math.max(
                  1,
                  Math.round(
                    (session.endDate.getTime() - session.startDate.getTime()) /
                      1000,
                  ),
                ),
              ),
            ];
            if (session.distanceMi != null) {
              labelParts.push(`${session.distanceMi} mi`);
            }
            return (
              <li
                key={`${session.startDate.toISOString()}-${session.workoutType}`}
              >
                <button
                  type="button"
                  onClick={() => void handlePickSession(row)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-xs hover:border-accent/40"
                >
                  <span className="font-medium text-foreground">
                    {labelParts.join(" · ")}
                  </span>
                  {session.sourceName ? (
                    <span className="mt-0.5 block text-muted">
                      {session.sourceName}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => void handleSkipSessionPick()}
              className="text-xs font-medium text-muted hover:text-foreground"
            >
              Skip — use time window samples instead
            </button>
          </li>
        </ul>
      ) : null}

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

function SimpleTimerRecorder({
  onResolved,
}: {
  onResolved: (startDate: Date, endDate: Date) => void;
}) {
  const startRef = useRef<Date | null>(null);
  const [recording, setRecording] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const elapsed =
    recording && startRef.current
      ? Math.max(
          1,
          Math.round((Date.now() - startRef.current.getTime()) / 1000),
        )
      : 0;

  void tick;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface-hover/60 p-3 gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Track time</p>
          <p className="text-xs text-muted mt-0.5">
            Start and end your activity. Add distance manually on web.
          </p>
        </div>
        {recording ? (
          <button
            type="button"
            onClick={() => {
              const start = startRef.current;
              if (!start) return;
              onResolved(start, new Date());
              startRef.current = null;
              setRecording(false);
            }}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
          >
            End
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              startRef.current = new Date();
              setRecording(true);
            }}
            className="shrink-0 rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent"
          >
            Start
          </button>
        )}
      </div>
      {recording ? (
        <p className="text-xs text-muted tabular-nums">
          {formatGpsTrackDuration(elapsed)}
        </p>
      ) : null}
    </div>
  );
}
