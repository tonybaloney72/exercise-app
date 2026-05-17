"use client";

import type { ReactNode } from "react";
import AnimatedSection from "@/components/common/AnimatedSection";
import SurfaceCard from "@/components/common/SurfaceCard";
import CategoryBadge from "@/components/common/CategoryBadge";
import { exerciseMap } from "@/data/exercises";
import { CATEGORIES } from "@/data/categories";
import { useResolvedStretches } from "@/hooks/useResolvedStretches";
import type { DayPlan } from "@/types";

interface WorkoutPlanPreviewProps {
  plan: DayPlan;
  /** e.g. "Scheduled for Thursday, May 15" or "Today’s prescribed plan" */
  bannerTitle: string;
  /** Secondary line under banner */
  bannerHint?: string;
  /** When true, show a short note that the workout can’t be started from this screen */
  isFutureDay?: boolean;
  /** When true, show target muscle breakdown (same as Today pre-workout) */
  showTargetMuscleList?: boolean;
}

export default function WorkoutPlanPreview({
  plan,
  bannerTitle,
  bannerHint,
  isFutureDay,
  showTargetMuscleList,
}: WorkoutPlanPreviewProps) {
  const allCategories = [...plan.strengthFocus, ...plan.coreGroups];
  const { warmUp, coolDown } = useResolvedStretches(plan);

  return (
    <AnimatedSection className="space-y-4" delay={0.05}>
      <SurfaceCard className="p-4 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-accent">
          {bannerTitle}
        </p>
        {bannerHint && (
          <p className="text-sm text-muted">{bannerHint}</p>
        )}
        {isFutureDay && (
          <p className="mt-2 text-xs text-muted">
            You can review what&apos;s planned ahead of time. To log sets and start the timer, come
            back on this day (use <span className="font-medium text-foreground">Today</span>).
          </p>
        )}
      </SurfaceCard>

      {showTargetMuscleList && (
        <SurfaceCard className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Target muscles</h2>
          <div className="space-y-1.5">
            {allCategories.map((cat) => (
              <div key={cat} className="flex items-start gap-2">
                <div
                  className="mt-1 h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORIES[cat].color }}
                />
                <div>
                  <span className="text-sm text-foreground">{CATEGORIES[cat].name}</span>
                  <p className="text-xs text-muted">{CATEGORIES[cat].description}</p>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}

      <PreviewSection title="Warm-Up Stretches">
        {warmUp.map((stretch) => {
          const ex = exerciseMap[stretch.exerciseId];
          if (!ex) return null;
          return (
            <PreviewRow
              key={stretch.exerciseId}
              name={ex.name}
              target={stretch.targetReps}
            />
          );
        })}
      </PreviewSection>

      {plan.hasJog && (
        <PreviewSection title="Jog">
          <div className="px-2 py-2.5">
            <p className="text-sm font-medium text-foreground">Run</p>
            <p className="text-xs text-muted">As prescribed on Today when you start</p>
          </div>
        </PreviewSection>
      )}

      {plan.rounds.map((round) => (
        <PreviewSection key={round.roundNumber} title={`Round ${round.roundNumber}`}>
          {round.exercises.map((ex) => {
            const meta = exerciseMap[ex.exerciseId];
            if (!meta) return null;
            return (
              <div
                key={`${round.roundNumber}-${ex.exerciseId}`}
                className="flex items-start justify-between gap-2 px-2 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{meta.name}</p>
                  <p className="text-xs text-muted">{ex.targetReps}</p>
                </div>
                <CategoryBadge category={meta.category} size="sm" />
              </div>
            );
          })}
        </PreviewSection>
      ))}

      <PreviewSection title="Cool-Down Stretches">
        {coolDown.map((stretch) => {
          const ex = exerciseMap[stretch.exerciseId];
          if (!ex) return null;
          return (
            <PreviewRow
              key={stretch.exerciseId}
              name={ex.name}
              target={stretch.targetReps}
            />
          );
        })}
      </PreviewSection>
    </AnimatedSection>
  );
}

function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="divide-y divide-border px-2 py-1">{children}</div>
    </SurfaceCard>
  );
}

function PreviewRow({ name, target }: { name: string; target: string }) {
  return (
    <div className="px-2 py-2.5">
      <p className="text-sm font-medium text-foreground">{name}</p>
      <p className="text-xs text-muted">{target}</p>
    </div>
  );
}
