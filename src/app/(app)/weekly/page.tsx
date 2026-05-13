"use client";

import { useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { dailyPlans, getPlanForDay } from "@/data/dailyPlans";
import { CATEGORIES } from "@/data/categories";
import CategoryBadge from "@/components/common/CategoryBadge";
import { useWorkoutStore } from "@/stores/useWorkoutStore";

const DAY_ABBRS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WeeklyPage() {
  const { workoutHistory, loadHistory } = useWorkoutStore();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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

  const completedDates = useMemo(() => {
    const set = new Set<string>();
    for (const log of workoutHistory) {
      set.add(log.date);
    }
    return set;
  }, [workoutHistory]);

  return (
    <div className="py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Weekly Overview</h1>
        <p className="text-sm text-muted mt-1">Your training week at a glance</p>
      </div>

      {/* Week strip */}
      <div className="flex gap-2">
        {weekDates.map((date, i) => {
          const dateStr = date.toISOString().split("T")[0];
          const isToday = i === today;
          const isCompleted = completedDates.has(dateStr);
          const isPast = i < today;

          return (
            <div
              key={i}
              className={`flex-1 flex flex-col items-center gap-1 rounded-xl py-2.5 border transition-colors ${
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
            </div>
          );
        })}
      </div>

      {/* Daily plans */}
      <div className="space-y-3">
        {dailyPlans
          .sort((a, b) => {
            const order = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sat, then Sun
            return order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek);
          })
          .map((plan) => {
            const isToday = plan.dayOfWeek === today;
            const dateStr = weekDates[plan.dayOfWeek]?.toISOString().split("T")[0];
            const isCompleted = dateStr ? completedDates.has(dateStr) : false;

            return (
              <motion.div
                key={plan.dayOfWeek}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: plan.dayOfWeek * 0.03 }}
                className={`rounded-xl border p-4 transition-colors ${
                  isToday
                    ? "border-accent/50 bg-accent/5"
                    : "border-border bg-surface"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${isToday ? "text-accent" : "text-foreground"}`}>
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
                  {plan.rounds.length} round{plan.rounds.length > 1 ? "s" : ""} · {plan.rounds.reduce((a, r) => a + r.exercises.length, 0)} exercises
                </div>
              </motion.div>
            );
          })}
      </div>
    </div>
  );
}
