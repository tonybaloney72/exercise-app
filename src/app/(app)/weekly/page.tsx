"use client";

import Link from "next/link";
import { useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import AnimatedSection from "@/components/common/AnimatedSection";
import { surfaceCardClassName } from "@/components/common/SurfaceCard";
import CategoryBadge from "@/components/common/CategoryBadge";
import { useTrainingWeekPlans } from "@/hooks/useTrainingWeekPlans";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { findWorkoutLogForDate } from "@/utils/workoutLogLookup";

const DAY_ABBRS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Same Sun–Sat order as the week strip and `weekDates`. */
const OVERVIEW_DOW_ORDER = [0, 1, 2, 3, 4, 5, 6] as const;

export default function WeeklyPage() {
  const { workoutHistory, loadHistory } = useWorkoutStore();
  const mode = useAuthStore((s) => s.mode);

  useEffect(() => {
    if (mode === "loading") return;
    loadHistory();
  }, [mode, loadHistory]);

  const today = new Date().getDay();

  const weekDates = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - dayOfWeek + i);
      return d;
    });
  }, []);

  const { weekByDow, loading: weekLoading, error: weekError } =
    useTrainingWeekPlans(weekDates);

  const weekDateKeys = useMemo(
    () => weekDates.map((d) => formatLocalDateKey(d)),
    [weekDates],
  );

  const completedDates = useMemo(() => {
    const set = new Set<string>();
    for (const key of weekDateKeys) {
      if (findWorkoutLogForDate(workoutHistory, key)) set.add(key);
    }
    return set;
  }, [workoutHistory, weekDateKeys]);

  return (
    <div className="py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Weekly Overview</h1>
        <p className="text-sm text-muted mt-1">Your training week at a glance</p>
      </div>

      {weekError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground">
          {weekError}
        </p>
      )}

      {/* Week strip */}
      <div className="flex gap-2">
        {weekDates.map((date, i) => {
          const dateStr = formatLocalDateKey(date);
          const isToday = i === today;
          const isCompleted = completedDates.has(dateStr);
          const isPast = i < today;

          return (
            <Link
              key={i}
              href={`/weekly/day/${dateStr}`}
              className={`flex-1 flex flex-col items-center gap-1 rounded-xl py-2.5 border transition-colors hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                isToday
                  ? "border-accent bg-accent/10"
                  : isCompleted
                  ? "border-green-500/30 bg-green-500/5"
                  : isPast
                  ? "border-border bg-surface opacity-50"
                  : "border-border bg-surface"
              }`}
            >
              <span className={`text-[10px] font-medium ${isToday ? "text-accent" : "text-muted"}`}>
                {DAY_ABBRS[i]}
              </span>
              <span className={`text-sm font-bold ${isToday ? "text-accent" : "text-foreground"}`}>
                {date.getDate()}
              </span>
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="h-1.5 w-1.5 rounded-full bg-green-400"
                />
              )}
              {!isCompleted && isPast && (
                <div className="h-1.5 w-1.5 rounded-full bg-border" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Daily plans */}
      <div className="space-y-3">
        {weekLoading &&
          OVERVIEW_DOW_ORDER.map((dow) => (
            <div
              key={dow}
              className={`${surfaceCardClassName} p-4 animate-pulse`}
            >
              <div className="h-4 w-2/5 rounded bg-border" />
              <div className="mt-2 h-3 w-3/5 rounded bg-border/80" />
              <div className="mt-3 flex gap-1.5">
                <div className="h-5 w-14 rounded-full bg-border/70" />
                <div className="h-5 w-14 rounded-full bg-border/70" />
              </div>
            </div>
          ))}

        {!weekLoading &&
          OVERVIEW_DOW_ORDER.map((dow) => {
            const plan = weekByDow?.[dow];
            if (!plan) return null;
            const isToday = plan.dayOfWeek === today;
            const dateStr = weekDates[plan.dayOfWeek]
              ? formatLocalDateKey(weekDates[plan.dayOfWeek])
              : undefined;
            const isCompleted = dateStr ? completedDates.has(dateStr) : false;

            return (
              <AnimatedSection
                key={plan.dayOfWeek}
                delay={plan.dayOfWeek * 0.03}
              >
                <Link
                  href={dateStr ? `/weekly/day/${dateStr}` : "/weekly"}
                  className={`block rounded-xl border p-4 transition-colors hover:border-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    isToday
                      ? "border-accent/50 bg-accent/5"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-sm font-semibold ${isToday ? "text-accent" : "text-foreground"}`}
                        >
                          {plan.name}
                        </h3>
                        {isToday && (
                          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent">
                            Today
                          </span>
                        )}
                        {isCompleted && (
                          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400">
                            Done
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{plan.theme}</p>
                    </div>
                    {plan.hasJog && (
                      <span className="text-xs text-sky-400">🏃</span>
                    )}
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {[...plan.strengthFocus, ...plan.coreGroups].map((cat) => (
                      <CategoryBadge key={cat} category={cat} />
                    ))}
                  </div>

                  <div className="mt-2 text-[10px] text-muted">
                    {plan.rounds.length} round{plan.rounds.length > 1 ? "s" : ""} ·{" "}
                    {plan.rounds.reduce((a, r) => a + r.exercises.length, 0)} exercises
                  </div>
                </Link>
              </AnimatedSection>
            );
          })}
      </div>
    </div>
  );
}
