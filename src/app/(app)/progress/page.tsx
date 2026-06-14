"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useTrainingWeekPlans } from "@/hooks/useTrainingWeekPlans";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import TabEnterMotion from "@/components/common/TabEnterMotion";
import ProgressPageSkeleton from "@/components/common/ProgressPageSkeleton";
import ProgressChartsSkeleton from "@/components/progress/ProgressChartsSkeleton";
import { useHistoryReady } from "@/hooks/useHistoryReady";
import { formatLocalDateKey } from "@/utils/localDateKey";
import {
  buildCardioMilesTotals,
  formatCardioRecentLine,
} from "@/lib/resolveWorkoutCardio";
import {
  CARDIO_ACTIVITY_ORDER,
  CARDIO_KIND_TO_EXERCISE_ID,
  CARDIO_ACTIVITY_EMOJI,
} from "@/lib/cardioActivities";
import { totalMilesCardioStatLabel } from "@/lib/cardioStatLabels";
import RotatingCardioStatCard, {
  type CardioStatCard,
} from "@/components/progress/RotatingCardioStatCard";

type ProgressStatCard = CardioStatCard;
type ProgressGridItem =
  | ProgressStatCard
  | { kind: "cardio-rotate"; cardioStats: CardioStatCard[] };

function isRotatingCardioSlot(
  item: ProgressGridItem,
): item is { kind: "cardio-rotate"; cardioStats: CardioStatCard[] } {
  return "kind" in item && item.kind === "cardio-rotate";
}
import Link from "next/link";
import EmptyState from "@/components/common/EmptyState";
import SurfaceCard, {
  surfaceCardClassName,
} from "@/components/common/SurfaceCard";
import { ProgressHistoryLink } from "@/components/progress/ProgressSubnavLink";
import {
  formatWorkoutHistoryDayLabel,
  workoutHistoryRowMeta,
} from "@/lib/workoutHistoryGroups";
import { weekToDatePlanAdherence } from "@/utils/progressStats";
import { filterCompletedWorkouts } from "@/utils/workoutLogLookup";

const ProgressChartsBlock = dynamic(
  () => import("@/components/progress/ProgressChartsBlock"),
  { ssr: false, loading: () => <ProgressChartsSkeleton /> },
);

export default function ProgressPage() {
  const historyReady = useHistoryReady();
  const { workoutHistory } = useWorkoutStore();
  const weekDates = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - dayOfWeek + i);
      return d;
    });
  }, []);
  const { weekByDow } = useTrainingWeekPlans(weekDates);

  const completedHistory = useMemo(
    () => filterCompletedWorkouts(workoutHistory),
    [workoutHistory],
  );

  const stats = useMemo(() => {
    const totalWorkouts = completedHistory.length;

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sortedDates = [...new Set(completedHistory.map((w) => w.date))]
      .sort()
      .reverse();

    for (let i = 0; i < sortedDates.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      const expectedStr = formatLocalDateKey(expected);
      if (sortedDates[i] === expectedStr) {
        currentStreak++;
      } else {
        break;
      }
    }

    const cardioMiles = buildCardioMilesTotals(completedHistory);
    const weekPlan = weekToDatePlanAdherence(completedHistory, weekByDow);

    return { totalWorkouts, currentStreak, cardioMiles, weekPlan };
  }, [completedHistory, weekByDow]);

  const statCards = useMemo(() => {
    const base = [
      {
        label: "Total Workouts",
        value: String(stats.totalWorkouts),
        icon: "💪",
      },
      {
        label: "Current Streak",
        value: `${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`,
        icon: "🔥",
      },
      {
        label: `Completed / planned`,
        value: `${stats.weekPlan.completed} / ${stats.weekPlan.planned}`,
        icon: "✅",
      },
    ];

    const cardioStats = CARDIO_ACTIVITY_ORDER.flatMap((kind) => {
      const id = CARDIO_KIND_TO_EXERCISE_ID[kind];
      const bucket = stats.cardioMiles[id];
      if (!bucket || (bucket.totalMiles <= 0 && bucket.sessionCount === 0)) {
        return [];
      }
      if (bucket.totalMiles <= 0) return [];
      return [
        {
          label: totalMilesCardioStatLabel(kind),
          value: bucket.totalMiles.toFixed(1),
          icon: CARDIO_ACTIVITY_EMOJI[kind],
        },
      ];
    });

    return { base, cardioStats };
  }, [stats]);

  const gridCards = useMemo((): ProgressGridItem[] => {
    const { base, cardioStats } = statCards;
    if (cardioStats.length <= 1) {
      return [...base, ...cardioStats];
    }
    return [...base, { kind: "cardio-rotate", cardioStats }];
  }, [statCards]);

  if (!historyReady) {
    return <ProgressPageSkeleton />;
  }

  return (
    <div className="py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Progress</h1>
        <p className="text-sm text-muted mt-1">Track your gains over time</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {gridCards.map((card, i) =>
          isRotatingCardioSlot(card) ? (
            <TabEnterMotion key="cardio-stats-rotate" delay={i * 0.05}>
              <RotatingCardioStatCard cards={card.cardioStats} />
            </TabEnterMotion>
          ) : (
            <TabEnterMotion
              key={card.label}
              delay={i * 0.05}
              className={`${surfaceCardClassName} p-4`}
            >
              <span className="text-lg">{card.icon}</span>
              <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
                {card.value}
              </p>
              <p className="text-sm leading-snug text-muted">
                {card.label}
              </p>
            </TabEnterMotion>
          ),
        )}
      </div>

      {completedHistory.length > 0 && <ProgressHistoryLink />}

      <ProgressChartsBlock history={completedHistory} />

      {completedHistory.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Recent</h2>
            <Link
              href="/progress/history"
              className="text-xs font-medium text-accent hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {[...completedHistory]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((log) => {
                const meta = workoutHistoryRowMeta(log);
                const cardioLine = formatCardioRecentLine(log);
                return (
                  <li key={log.id}>
                    <Link
                      href={`/progress/history/${log.date}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-accent/40 hover:bg-surface-hover"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {formatWorkoutHistoryDayLabel(log.date)}
                        </p>
                        <p className="text-xs text-muted truncate">
                          {meta.exercisesDone}/{meta.exercisesTotal} exercises
                          {meta.durationLabel ? ` · ${meta.durationLabel}` : ""}
                          {cardioLine ? ` · ${cardioLine}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-green-400">
                        Done
                      </span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      {completedHistory.length === 0 && (
        <SurfaceCard className="border-dashed bg-surface/50 py-12">
          <EmptyState
            icon="📈"
            title="No workouts logged yet."
            description="Complete your first workout to see trends and history here."
            action={{ label: "Start today's workout", href: "/today" }}
          />
        </SurfaceCard>
      )}
    </div>
  );
}
