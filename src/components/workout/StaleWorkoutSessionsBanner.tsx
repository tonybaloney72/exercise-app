"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AnimatedSection from "@/components/common/AnimatedSection";
import SurfaceCard from "@/components/common/SurfaceCard";
import { loadActiveWorkoutDraft } from "@/lib/activeWorkoutDraft";
import { canResumeInProgressForDate } from "@/lib/backfillWorkout";
import {
  findStaleInProgressSessions,
  formatStaleSessionDateLabel,
  isInProgressWorkoutLog,
  isStaleSessionDate,
} from "@/lib/workoutSessionStale";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { formatLocalDateKey } from "@/utils/localDateKey";
import type { WorkoutLog } from "@/types";

interface StaleWorkoutSessionsBannerProps {
  /** Hide while customizing or in an active session. */
  hidden?: boolean;
}

function StaleWorkoutSessionCard({
  session,
  workoutHistory,
  activeWorkout,
  onDiscard,
}: {
  session: WorkoutLog;
  workoutHistory: WorkoutLog[];
  activeWorkout: WorkoutLog | null;
  onDiscard: (id: string) => void;
}) {
  const resumeEligibility = canResumeInProgressForDate({
    dateKey: session.date,
    workoutHistory,
    activeWorkout,
  });
  const logHref = `/progress/history/${session.date}/log`;

  return (
    <SurfaceCard className="border-amber-500/30 bg-amber-500/5 p-4 space-y-3 h-full">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {formatStaleSessionDateLabel(session.date)}
        </p>
        <p className="text-xs text-muted leading-snug">
          Continue on that day&apos;s log page, or discard to start fresh on
          Today.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {resumeEligibility.ok ? (
          <Link
            href={logHref}
            className="flex-1 rounded-xl bg-accent py-2.5 text-center text-sm font-bold text-white hover:bg-accent/90"
          >
            Continue logging
          </Link>
        ) : (
          <p className="text-xs text-muted sm:flex-1 sm:self-center">
            {resumeEligibility.reason}
          </p>
        )}
        <button
          type="button"
          onClick={() => onDiscard(session.id)}
          className="flex-1 rounded-xl border border-border bg-surface py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground hover:border-foreground/20"
        >
          Discard
        </button>
      </div>
    </SurfaceCard>
  );
}

function CarouselChevron({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const label = direction === "prev" ? "Previous workout" : "Next workout";
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-accent/40 hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {direction === "prev" ? (
          <polyline points="15 18 9 12 15 6" />
        ) : (
          <polyline points="9 18 15 12 9 6" />
        )}
      </svg>
    </button>
  );
}

export default function StaleWorkoutSessionsBanner({
  hidden = false,
}: StaleWorkoutSessionsBannerProps) {
  const todayKey = formatLocalDateKey();
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { workoutHistory, activeWorkout, discardStaleWorkout } =
    useWorkoutStore();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

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

  useEffect(() => {
    setCarouselIndex(0);
    setShowAll(false);
  }, [staleSessions.length]);

  if (hidden || staleSessions.length === 0) return null;

  const count = staleSessions.length;
  const safeIndex = Math.min(carouselIndex, count - 1);
  const showCarousel = count > 1 && !showAll;

  return (
    <AnimatedSection delay={0.14} className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Unfinished workouts
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {count === 1
              ? "One session from a previous day"
              : `${count} sessions from previous days`}
          </p>
        </div>
        {count > 1 ? (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="shrink-0 text-xs font-medium text-accent hover:underline"
          >
            {showAll ? "Show carousel" : `View all (${count})`}
          </button>
        ) : null}
      </div>

      {showAll ? (
        <ul className="space-y-3" aria-label="All unfinished workouts">
          {staleSessions.map((session) => (
            <li key={session.id}>
              <StaleWorkoutSessionCard
                session={session}
                workoutHistory={workoutHistory}
                activeWorkout={activeWorkout}
                onDiscard={discardStaleWorkout}
              />
            </li>
          ))}
        </ul>
      ) : showCarousel ? (
        <div className="space-y-3">
          <div className="flex items-stretch gap-2">
            <CarouselChevron
              direction="prev"
              disabled={safeIndex === 0}
              onClick={() => setCarouselIndex((i) => Math.max(0, i - 1))}
            />
            <div className="min-w-0 flex-1">
              <StaleWorkoutSessionCard
                session={staleSessions[safeIndex]}
                workoutHistory={workoutHistory}
                activeWorkout={activeWorkout}
                onDiscard={discardStaleWorkout}
              />
            </div>
            <CarouselChevron
              direction="next"
              disabled={safeIndex >= count - 1}
              onClick={() =>
                setCarouselIndex((i) => Math.min(count - 1, i + 1))
              }
            />
          </div>
          <div
            className="flex justify-center gap-1.5"
            role="tablist"
            aria-label="Unfinished workout pages"
          >
            {staleSessions.map((session, i) => (
              <button
                key={session.id}
                type="button"
                role="tab"
                aria-selected={i === safeIndex}
                aria-label={formatStaleSessionDateLabel(session.date)}
                onClick={() => setCarouselIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === safeIndex
                    ? "w-5 bg-accent"
                    : "w-1.5 bg-border hover:bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        <StaleWorkoutSessionCard
          session={staleSessions[0]}
          workoutHistory={workoutHistory}
          activeWorkout={activeWorkout}
          onDiscard={discardStaleWorkout}
        />
      )}
    </AnimatedSection>
  );
}
