"use client";

import Link from "next/link";
import { useMemo } from "react";
import SurfaceCard from "@/components/common/SurfaceCard";
import { getBackfillEligibility } from "@/lib/backfillWorkout";
import { loadActiveWorkoutDraft } from "@/lib/activeWorkoutDraft";
import {
  findStaleInProgressSessions,
  formatStaleSessionDateLabel,
  isInProgressWorkoutLog,
  isStaleSessionDate,
} from "@/lib/workoutSessionStale";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { formatLocalDateKey } from "@/utils/localDateKey";

export default function StaleWorkoutSessionsBanner() {
  const todayKey = formatLocalDateKey();
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { workoutHistory, activeWorkout, discardStaleWorkout } =
    useWorkoutStore();

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

  if (staleSessions.length === 0) return null;

  return (
    <div className="space-y-3">
      {staleSessions.map((session) => {
        const eligibility = getBackfillEligibility({
          dateKey: session.date,
          workoutHistory,
          activeWorkout,
          todayKey,
        });
        const logHref = `/progress/history/${session.date}/log`;

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
                This session is from a previous day. It won&apos;t resume on
                Today automatically — continue logging for that date or discard
                it.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {eligibility.ok ? (
                <Link
                  href={logHref}
                  className="flex-1 rounded-xl bg-accent py-2.5 text-center text-sm font-bold text-white hover:bg-accent/90"
                >
                  Continue logging
                </Link>
              ) : (
                <p className="text-xs text-muted sm:flex-1 sm:self-center">
                  {eligibility.reason}
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
