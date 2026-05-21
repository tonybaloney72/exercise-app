"use client";

import { useMemo, useState } from "react";
import SurfaceCard from "@/components/common/SurfaceCard";
import { loadActiveWorkoutDraft } from "@/lib/activeWorkoutDraft";
import { canResumeInProgressForDate } from "@/lib/backfillWorkout";
import { resolveDayPlanForAuth } from "@/lib/planResolver";
import {
  findStaleInProgressSessions,
  formatStaleSessionDateLabel,
  isInProgressWorkoutLog,
  isStaleSessionDate,
} from "@/lib/workoutSessionStale";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { formatLocalDateKey } from "@/utils/localDateKey";

interface StaleWorkoutSessionsBannerProps {
  /** Hide while customizing or in an active session. */
  hidden?: boolean;
}

export default function StaleWorkoutSessionsBanner({
  hidden = false,
}: StaleWorkoutSessionsBannerProps) {
  const todayKey = formatLocalDateKey();
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { workoutHistory, activeWorkout, discardStaleWorkout, continueInProgressWorkout } =
    useWorkoutStore();
  const [continuingId, setContinuingId] = useState<string | null>(null);
  const [continueError, setContinueError] = useState<string | null>(null);

  const staleSessions = useMemo(() => {
    const fromHistory = findStaleInProgressSessions(workoutHistory, todayKey);
    if (mode !== "guest") return fromHistory;
    const draft = loadActiveWorkoutDraft({ mode: "guest", userId });
    if (
      !draft?.log ||
      !isInProgressWorkoutLog(draft.log) ||
      !isStaleSessionDate(draft.log.date, todayKey)
    ) {
      return fromHistory;
    }
    if (fromHistory.some((w) => w.id === draft.log.id)) return fromHistory;
    return [draft.log, ...fromHistory];
  }, [workoutHistory, todayKey, mode, userId]);

  if (hidden || staleSessions.length === 0) return null;

  async function handleContinue(sessionDate: string, sessionId: string) {
    if (mode === "loading") return;
    setContinuingId(sessionId);
    setContinueError(null);
    try {
      const plan = await resolveDayPlanForAuth(sessionDate, mode);
      if (!plan) {
        setContinueError("Could not load the plan for that day.");
        return;
      }
      const ok = continueInProgressWorkout(plan, sessionDate);
      if (!ok) {
        const check = canResumeInProgressForDate({
          dateKey: sessionDate,
          workoutHistory: useWorkoutStore.getState().workoutHistory,
          activeWorkout: useWorkoutStore.getState().activeWorkout,
        });
        setContinueError(check.ok ? "Could not resume workout." : check.reason);
      }
    } catch {
      setContinueError("Could not load the plan for that day.");
    } finally {
      setContinuingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {continueError && (
        <p className="text-xs text-red-400 text-center px-2" role="alert">
          {continueError}
        </p>
      )}
      {staleSessions.map((session) => {
        const resumeEligibility = canResumeInProgressForDate({
          dateKey: session.date,
          workoutHistory,
          activeWorkout,
        });
        const busy = continuingId === session.id;

        return (
          <SurfaceCard
            key={session.id}
            className="border-amber-500/30 bg-amber-500/5 p-4 space-y-3"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Unfinished workout · {formatStaleSessionDateLabel(session.date)}
              </p>
              <p className="text-xs text-muted leading-snug">
                This session is from a previous day. Continue logging here on
                Today, or discard it to start fresh.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {resumeEligibility.ok ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleContinue(session.date, session.id)}
                  className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-bold text-white hover:bg-accent/90 disabled:opacity-50"
                >
                  {busy ? "Loading…" : "Continue logging"}
                </button>
              ) : (
                <p className="text-xs text-muted sm:flex-1 sm:self-center">
                  {resumeEligibility.reason}
                </p>
              )}
              <button
                type="button"
                onClick={() => discardStaleWorkout(session.id)}
                className="flex-1 rounded-xl border border-border bg-surface py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground hover:border-foreground/20"
              >
                Discard
              </button>
            </div>
          </SurfaceCard>
        );
      })}
    </div>
  );
}
