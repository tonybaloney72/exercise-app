"use client";

import { useRef, type ReactNode } from "react";
import WorkoutPlanEditor from "@/components/workout/WorkoutPlanEditor";
import WorkoutPlanPreview from "@/components/workout/WorkoutPlanPreview";
import WorkoutSession from "@/components/workout/WorkoutSession";
import FloatingTimer from "@/components/common/FloatingTimer";
import {
  isOptionalRestDay,
  REST_DAY_DESCRIPTIONS,
  isFullRestDay,
} from "@/lib/restDays";
import type { DayPlan } from "@/types";

export type TodayWorkoutPanelMode = "preview" | "plan-edit" | "session";

type Props = {
  mode: TodayWorkoutPanelMode;
  plan: DayPlan;
  todayKey: string;
  isCustomWeek: boolean;
  canCustomize: boolean;
  saving: boolean;
  onStart: () => void;
  onCustomize: () => void;
  onSavePlan: (plan: DayPlan) => void;
  onCancelCustomize: () => void;
  onResetDay: () => void;
  onCollapse?: () => void;
};

const btnPrimary =
  "rounded-xl bg-accent py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-50";
const btnSecondary =
  "rounded-xl border border-accent/40 bg-accent/10 py-3.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-50";
const btnNeutral =
  "rounded-xl border border-border bg-surface py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50";

function WorkoutActionBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export default function TodayWorkoutPanel({
  mode,
  plan,
  todayKey,
  isCustomWeek,
  canCustomize,
  saving,
  onStart,
  onCustomize,
  onSavePlan,
  onCancelCustomize,
  onResetDay,
  onCollapse,
}: Props) {
  const draftRef = useRef(plan);

  if (mode === "session") {
    return (
      <div className="space-y-4">
        <WorkoutSession plan={plan} />
        <FloatingTimer />
      </div>
    );
  }

  if (mode === "plan-edit") {
    return (
      <div className="space-y-4">
        <WorkoutActionBar>
          <button
            type="button"
            disabled={saving}
            onClick={onCancelCustomize}
            className={`${btnNeutral} flex-1 min-w-32`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSavePlan(draftRef.current)}
            className={`${btnPrimary} flex-1 min-w-32`}
          >
            {saving ? "Saving…" : "Save plan"}
          </button>
        </WorkoutActionBar>

        <WorkoutPlanEditor
          key={todayKey}
          initialPlan={plan}
          isCustomWeek={isCustomWeek}
          saving={saving}
          embedded
          saveLabel="Save plan"
          onSave={onSavePlan}
          onCancel={onCancelCustomize}
          onResetDay={onResetDay}
          onDirtyChange={(_, draft) => {
            draftRef.current = draft;
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <button
          type="button"
          onClick={onStart}
          className={`${btnPrimary} w-full`}
        >
          Start workout
        </button>
        {canCustomize || onCollapse ? (
          <WorkoutActionBar>
            {canCustomize ? (
              <button
                type="button"
                onClick={onCustomize}
                className={`${btnSecondary} flex-1 min-w-0`}
              >
                Customize plan
              </button>
            ) : null}
            {onCollapse ? (
              <button
                type="button"
                onClick={onCollapse}
                className={`${btnNeutral} flex-1 min-w-0`}
              >
                Hide workout
              </button>
            ) : null}
          </WorkoutActionBar>
        ) : null}
      </div>

      {isOptionalRestDay(plan) && !isFullRestDay(plan) ? (
        <p className="text-sm text-muted leading-snug rounded-lg border border-border bg-surface-hover/40 px-3 py-2">
          {REST_DAY_DESCRIPTIONS.stretches}{" "}
          <span className="font-medium text-foreground">Customize plan</span> to
          add optional exercises, stretches, or cardio.
        </p>
      ) : null}

      <WorkoutPlanPreview plan={plan} embedded showTargetMuscleList={false} />
    </div>
  );
}
