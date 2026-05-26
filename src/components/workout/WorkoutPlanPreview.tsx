"use client";

import AnimatedSection from "@/components/common/AnimatedSection";
import CollapsibleSection from "@/components/common/CollapsibleSection";
import SurfaceCard from "@/components/common/SurfaceCard";
import CategoryBadge from "@/components/common/CategoryBadge";
import { exerciseMap } from "@/data/exercises";
import { CATEGORIES } from "@/data/categories";
import { useResolvedStretches } from "@/hooks/useResolvedStretches";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { TrainingWeekDays } from "@/lib/repos";
import type { DayPlan } from "@/types";
import { formatPlanTargetPrescription } from "@/utils/effectiveExerciseSettings";

interface WorkoutPlanPreviewProps {
  plan: DayPlan;
  /** When set, stretch lists use week-aware variety (same as workout start). */
  weekByDow?: TrainingWeekDays | null;
  /** Optional banner above the plan (omit for a compact preview). */
  bannerTitle?: string;
  /** Secondary line under banner */
  bannerHint?: string;
  /** When true, show a short note that the workout can’t be started from this screen */
  isFutureDay?: boolean;
  /** When true, show target muscle breakdown (same as Today pre-workout) */
  showTargetMuscleList?: boolean;
}

export default function WorkoutPlanPreview({
  plan,
  weekByDow,
  bannerTitle,
  bannerHint,
  isFutureDay,
  showTargetMuscleList,
}: WorkoutPlanPreviewProps) {
  const allCategories = [...plan.strengthFocus, ...plan.coreGroups];
  const { warmUp, coolDown } = useResolvedStretches(plan, weekByDow);
  const exerciseSettings = useExerciseSettingsStore((s) => s.byExerciseId);
  const expertiseByGroup = useSettingsStore((s) => s.expertiseByGroup);

  const roundTargetLabel = (exerciseId: string, fallback: string) => {
    const meta = exerciseMap[exerciseId];
    if (!meta) return fallback;
    return formatPlanTargetPrescription(meta, exerciseSettings[exerciseId], {
      expertiseByGroup,
    });
  };

  const showBanner = Boolean(bannerTitle || bannerHint || isFutureDay);

  return (
    <AnimatedSection className="space-y-4" delay={0.05}>
      {showBanner && (
        <SurfaceCard className="p-4 space-y-1">
          {bannerTitle && (
            <p className="text-xs font-medium uppercase tracking-wider text-accent">
              {bannerTitle}
            </p>
          )}
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
      )}

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

      <CollapsibleSection title="Warm-Up Stretches" defaultOpen={false}>
        <div className="divide-y divide-border px-2 py-1">
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
        </div>
      </CollapsibleSection>

      {plan.hasJog && (
        <CollapsibleSection title="Jog" defaultOpen>
          <div className="px-2 py-2.5">
            <p className="text-sm font-medium text-foreground">Run</p>
            <p className="text-xs text-muted">As prescribed on Today when you start</p>
          </div>
        </CollapsibleSection>
      )}

      {plan.rounds.map((round) => (
        <CollapsibleSection
          key={round.roundNumber}
          title={`Round ${round.roundNumber}`}
          defaultOpen
        >
          <div className="divide-y divide-border px-2 py-1">
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
                    <p className="text-xs text-muted">
                      {roundTargetLabel(ex.exerciseId, ex.targetReps)}
                    </p>
                  </div>
                  <CategoryBadge category={meta.category} size="sm" />
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      ))}

      <CollapsibleSection title="Cool-Down Stretches" defaultOpen={false}>
        <div className="divide-y divide-border px-2 py-1">
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
        </div>
      </CollapsibleSection>
    </AnimatedSection>
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
