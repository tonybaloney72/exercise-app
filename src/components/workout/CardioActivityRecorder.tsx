"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatGpsTrackDuration,
  GpsTrackSession,
  liveGpsTrackDistanceMi,
  pauseGpsTrackSession,
  resumeGpsTrackSession,
} from "@/lib/geo/gpsTrackSession";
import {
  cardioActivityActiveSeconds,
  initialCardioActivityTimerState,
  isCardioActivityRecording,
  pauseCardioActivityTimer,
  resetCardioActivityTimer,
  resumeCardioActivityTimer,
  startCardioActivityTimer,
  type CardioActivityTimerState,
} from "@/lib/cardioActivityTimer";
import { ensureCardioHealthReadAccess } from "@/lib/health";
import { displayHealthSourceName } from "@/lib/health/healthSourceDisplayName";
import {
  resolveCardioQuickLog,
  resolveCardioQuickLogFromSession,
  type ResolvedCardioQuickLog,
} from "@/lib/health/resolveCardioQuickLog";
import type { ScoredCardioSession } from "@/lib/health/cardioSessionMatch";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { clientTrace } from "@/lib/diagnostics/clientTrace";
import { formatSecondsToMMSS } from "@/utils/time";
import { cardioKindUsesGps } from "@/lib/cardioKinds";
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
  const timerRef = useRef<CardioActivityTimerState>(
    initialCardioActivityTimerState(),
  );
  const activeDurationRef = useRef(0);
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [candidates, setCandidates] = useState<ScoredCardioSession[]>([]);
  const [gpsSnapshot, setGpsSnapshot] = useState<Awaited<
    ReturnType<GpsTrackSession["stop"]>
  > | null>(null);

  const native = isNativePlatform();
  const usesGps = cardioKindUsesGps(kind);

  useEffect(() => {
    if (phase !== "recording" || paused) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase, paused]);

  useEffect(() => {
    return () => {
      void sessionRef.current?.dispose();
    };
  }, []);

  const liveSnapshot = useMemo(() => {
    void tick;
    const timer = timerRef.current;
    if (phase !== "recording" || !isCardioActivityRecording(timer)) {
      return null;
    }
    const durationSeconds = cardioActivityActiveSeconds(timer);
    if (!usesGps) {
      return { durationSeconds, distanceMi: 0 };
    }
    return {
      durationSeconds,
      distanceMi: liveGpsTrackDistanceMi(sessionRef.current),
    };
  }, [phase, tick, usesGps]);

  const resetRecorder = useCallback(() => {
    timerRef.current = resetCardioActivityTimer();
    setPaused(false);
    setCandidates([]);
    setGpsSnapshot(null);
    startDateRef.current = null;
    endDateRef.current = null;
    activeDurationRef.current = 0;
  }, []);

  const finishResolve = useCallback(
    (result: ResolvedCardioQuickLog) => {
      setPhase("idle");
      resetRecorder();
      onResolved(result);
    },
    [onResolved, resetRecorder],
  );

  const activeDurationSeconds = useCallback(
    () =>
      activeDurationRef.current > 0
        ? activeDurationRef.current
        : cardioActivityActiveSeconds(timerRef.current),
    [],
  );

  async function handleStart() {
    setError(null);
    setCandidates([]);
    const startedAt = new Date();
    startDateRef.current = startedAt;
    timerRef.current = startCardioActivityTimer(startedAt.getTime());
    setPaused(false);
    clientTrace("cardio-recorder", "start", { kind });

    if (native && usesGps) {
      const gps = new GpsTrackSession();
      sessionRef.current = gps;
      try {
        await gps.startImmediate();
      } catch (err) {
        sessionRef.current = null;
        startDateRef.current = null;
        timerRef.current = resetCardioActivityTimer();
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

  async function handlePause() {
    if (phase !== "recording" || paused) return;
    timerRef.current = pauseCardioActivityTimer(timerRef.current);
    setPaused(true);
    try {
      await pauseGpsTrackSession(sessionRef.current);
    } catch (err) {
      clientTrace(
        "cardio-recorder",
        "gps_pause_error",
        { message: err instanceof Error ? err.message : String(err) },
        "warn",
      );
    }
  }

  async function handleResume() {
    if (phase !== "recording" || !paused) return;
    timerRef.current = resumeCardioActivityTimer(timerRef.current);
    setPaused(false);
    try {
      await resumeGpsTrackSession(sessionRef.current);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not resume GPS. Timer is running again.",
      );
    }
  }

  async function handleEnd() {
    const startDate = startDateRef.current;
    if (!startDate) return;

    const endDate = new Date();
    endDateRef.current = endDate;
    timerRef.current = pauseCardioActivityTimer(timerRef.current);
    const activeSeconds = cardioActivityActiveSeconds(timerRef.current);
    activeDurationRef.current = activeSeconds;
    setPhase("resolving");
    setError(null);
    setPaused(false);

    let snapshot = gpsSnapshot;
    const gps = sessionRef.current;
    if (gps) {
      const stopped = await gps.stop(activeSeconds);
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
        activeDurationSeconds: activeSeconds,
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
        activeDurationSeconds: activeDurationSeconds(),
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
      activeDurationSeconds: activeDurationSeconds(),
      preferSamples: true,
    });
    finishResolve(result);
  }

  async function handleCancel() {
    await sessionRef.current?.dispose();
    sessionRef.current = null;
    resetRecorder();
    setPhase("idle");
    setError(null);
  }

  if (!native) {
    return (
      <SimpleTimerRecorder
        onResolved={(result) => {
          onResolved(result);
        }}
      />
    );
  }

  const statusLine =
    phase === "recording" && liveSnapshot
      ? `${paused ? "Paused · " : ""}${formatGpsTrackDuration(liveSnapshot.durationSeconds)}${
          usesGps
            ? liveSnapshot.distanceMi > 0
              ? ` · ${liveSnapshot.distanceMi} mi`
              : paused
                ? ""
                : " · GPS tracking…"
            : ""
        }`
      : phase === "resolving"
        ? "Pulling activity from Health Connect…"
        : null;

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Track activity</p>
          <p className="text-xs text-muted mt-0.5">
            {phase === "idle"
              ? usesGps
                ? "Start records time and GPS. A notification keeps tracking when the screen is off."
                : "Start records time. Distance comes from Health Connect or your manual entry."
              : phase === "pick_session"
                ? "Pick the Health Connect session that matches this activity."
                : "Pause stops the timer and GPS. Tap End when finished."}
          </p>
        </div>
        {phase === "recording" ? (
          <div className="flex shrink-0 items-center gap-1.5">
            {paused ? (
              <button
                type="button"
                onClick={() => void handleResume()}
                className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent"
              >
                Resume
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handlePause()}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted"
              >
                Pause
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleEnd()}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
            >
              End
            </button>
          </div>
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
            const recordedBy = displayHealthSourceName(session.sourceName);
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
                  {recordedBy ? (
                    <span className="mt-0.5 block text-muted">{recordedBy}</span>
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
  onResolved: (result: ResolvedCardioQuickLog) => void;
}) {
  const startRef = useRef<Date | null>(null);
  const timerRef = useRef<CardioActivityTimerState>(
    initialCardioActivityTimerState(),
  );
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!recording || paused) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording, paused]);

  const elapsed = useMemo(() => {
    void tick;
    if (!recording || !isCardioActivityRecording(timerRef.current)) return 0;
    return cardioActivityActiveSeconds(timerRef.current);
  }, [recording, tick]);

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface-hover/60 p-3 gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Track time</p>
          <p className="text-xs text-muted mt-0.5">
            {recording
              ? "Pause stops the timer. Tap End when finished."
              : "Start and end your activity."}
          </p>
        </div>
        {recording ? (
          <div className="flex shrink-0 items-center gap-1.5">
            {paused ? (
              <button
                type="button"
                onClick={() => {
                  timerRef.current = resumeCardioActivityTimer(
                    timerRef.current,
                  );
                  setPaused(false);
                }}
                className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent"
              >
                Resume
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  timerRef.current = pauseCardioActivityTimer(timerRef.current);
                  setPaused(true);
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted"
              >
                Pause
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const start = startRef.current;
                if (!start) return;
                const activeSeconds = cardioActivityActiveSeconds(
                  timerRef.current,
                );
                onResolved({
                  startDate: start,
                  endDate: new Date(),
                  durationSeconds: activeSeconds,
                  resolution: "timer_only",
                });
                startRef.current = null;
                timerRef.current = resetCardioActivityTimer();
                setRecording(false);
                setPaused(false);
              }}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
            >
              End
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              const startedAt = new Date();
              startRef.current = startedAt;
              timerRef.current = startCardioActivityTimer(startedAt.getTime());
              setPaused(false);
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
          {paused ? "Paused · " : ""}
          {formatGpsTrackDuration(elapsed)}
        </p>
      ) : null}
    </div>
  );
}
