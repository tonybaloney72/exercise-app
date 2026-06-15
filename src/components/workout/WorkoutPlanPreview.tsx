"use client";

import AnimatedSection from "@/components/common/AnimatedSection";
import SurfaceCard from "@/components/common/SurfaceCard";
import WorkoutPlanExerciseRow from "@/components/workout/WorkoutPlanExerciseRow";
import WorkoutSectionCard from "@/components/workout/WorkoutSectionCard";
import { exerciseMap } from "@/core/catalog";
import { CATEGORIES } from "@/core/catalog";
import { useResolvedStretches } from "@/hooks/useResolvedStretches";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { TrainingWeekDays } from "@/lib/repos";
import type { DayPlan } from "@/types";
import {
  CARDIO_ACTIVITY_LABELS,
  resolveCardioActivities,
} from "@/lib/cardioActivities";
import { isFullRestDay } from "@/lib/restDays";
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
  /** Skip outer motion wrapper when nested in TodayWorkoutPanel. */
  embedded?: boolean;
}

function exerciseCountLabel(count: number): string {
  if (count === 0) return "No exercises";
  return `${count} exercise${count === 1 ? "" : "s"}`;
}

function stretchCountLabel(count: number): string {
  if (count === 0) return "None";
  return `${count} stretch${count === 1 ? "" : "es"}`;
}

export default function WorkoutPlanPreview({
  plan,
  weekByDow,
  bannerTitle,
  bannerHint,
  isFutureDay,
  showTargetMuscleList,
  embedded = false,
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

  const body = (
    <>
      {showBanner && (
        <SurfaceCard className="p-4 space-y-1">
          {bannerTitle && (
            <p className="text-xs font-medium uppercase tracking-wider text-accent">
              {bannerTitle}
            </p>
          )}
          {bannerHint && <p className="text-sm text-muted">{bannerHint}</p>}
          {isFutureDay && (
            <p className="mt-2 text-xs text-muted">
              You can review what&apos;s planned ahead of time. To log sets and
              start the timer, come back on this day (use{" "}
              <span className="font-medium text-foreground">Today</span>).
            </p>
          )}
        </SurfaceCard>
      )}

      {showTargetMuscleList && (
        <SurfaceCard className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Target muscles
          </h2>
          <div className="space-y-1.5">
            {allCategories.map((cat) => (
              <div key={cat} className="flex items-start gap-2">
                <div
                  className="mt-1 h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORIES[cat].color }}
                />
                <div>
                  <span className="text-sm text-foreground">
                    {CATEGORIES[cat].name}
                  </span>
                  <p className="text-xs text-muted">
                    {CATEGORIES[cat].description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}

      {!isFullRestDay(plan) && warmUp.length > 0 && (
        <WorkoutSectionCard
          title="Warm-Up Stretches"
          defaultOpen={false}
          statusLabel={stretchCountLabel(warmUp.length)}
        >
          {warmUp.map((stretch) => {
            const ex = exerciseMap[stretch.exerciseId];
            if (!ex) return null;
            return (
              <WorkoutPlanExerciseRow
                key={stretch.exerciseId}
                name={ex.name}
                detailText={stretch.targetReps}
                readOnly
              />
            );
          })}
        </WorkoutSectionCard>
      )}

      {!isFullRestDay(plan) && resolveCardioActivities(plan).length > 0 && (
        <WorkoutSectionCard
          title="Cardio & endurance"
          defaultOpen
          statusLabel={`${resolveCardioActivities(plan).length} activit${
            resolveCardioActivities(plan).length === 1 ? "y" : "ies"
          }`}
        >
          {resolveCardioActivities(plan).map((activity) => {
            const meta = exerciseMap[activity.exerciseId];
            return (
              <WorkoutPlanExerciseRow
                key={activity.kind}
                name={meta?.name ?? CARDIO_ACTIVITY_LABELS[activity.kind]}
                detailText={
                  activity.defaultPrescription ??
                  meta?.defaultReps ??
                  "Log time and distance when you start"
                }
                readOnly
              />
            );
          })}
        </WorkoutSectionCard>
      )}

      {plan.rounds.map((round) => (
        <WorkoutSectionCard
          key={round.roundNumber}
          title={`Round ${round.roundNumber}`}
          defaultOpen
          statusLabel={exerciseCountLabel(round.exercises.length)}
        >
          {round.exercises.map((ex) => {
            const meta = exerciseMap[ex.exerciseId];
            if (!meta) return null;
            return (
              <WorkoutPlanExerciseRow
                key={`${round.roundNumber}-${ex.exerciseId}`}
                name={meta.name}
                detailText={roundTargetLabel(ex.exerciseId, ex.targetReps)}
                readOnly
              />
            );
          })}
        </WorkoutSectionCard>
      ))}

      {!isFullRestDay(plan) && coolDown.length > 0 && (
        <WorkoutSectionCard
          title="Cool-Down Stretches"
          defaultOpen={false}
          statusLabel={stretchCountLabel(coolDown.length)}
        >
          {coolDown.map((stretch) => {
            const ex = exerciseMap[stretch.exerciseId];
            if (!ex) return null;
            return (
              <WorkoutPlanExerciseRow
                key={stretch.exerciseId}
                name={ex.name}
                detailText={stretch.targetReps}
                readOnly
              />
            );
          })}
        </WorkoutSectionCard>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <AnimatedSection className="space-y-4" delay={0.05}>
      {body}
    </AnimatedSection>
  );
}
