"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PlanCardSkeleton from "@/components/common/PlanCardSkeleton";
import SurfaceCard from "@/components/common/SurfaceCard";
import WorkoutPlanEditor from "@/components/workout/WorkoutPlanEditor";
import { countPlannedExercises } from "@/lib/dayPlanDraft";
import {
  cloneDayPlan,
  resetDayToGenerated,
  saveCustomDayPlan,
} from "@/lib/trainingWeekCustomize";
import { bumpTrainingWeekPlans } from "@/lib/trainingWeekRefresh";
import { toastSaveError } from "@/utils/saveErrorToast";
import { useTrainingWeekPlans } from "@/hooks/useTrainingWeekPlans";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { DayPlan } from "@/types";
import type { TrainingWeekDays } from "@/lib/repos";
import { getWeekDateKeys } from "@/utils/weekCalendar";
import { formatLocalDateKey } from "@/utils/localDateKey";

const DAY_ABBRS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function weekDatesFromKeys(dateKeys: string[]): Date[] {
  return dateKeys.map((key) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y!, m! - 1, d!);
  });
}

export default function CustomWeekWizard() {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const programMode = useSettingsStore((s) => s.programMode);
  const hydrated = useSettingsStore((s) => s.hydrated);

  const weekDateKeys = useMemo(() => getWeekDateKeys(), []);
  const weekDates = useMemo(
    () => weekDatesFromKeys(weekDateKeys),
    [weekDateKeys],
  );
  const { weekByDow, loading, error } = useTrainingWeekPlans(weekDates);

  const [activeDow, setActiveDow] = useState(0);
  const [localWeek, setLocalWeek] = useState<TrainingWeekDays | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pendingDow, setPendingDow] = useState<number | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const latestDraftRef = useRef<DayPlan | null>(null);

  const handleDraftChange = useCallback((isDirty: boolean, draft: DayPlan) => {
    setDirty(isDirty);
    latestDraftRef.current = draft;
  }, []);

  useEffect(() => {
    if (weekByDow) setLocalWeek(weekByDow);
  }, [weekByDow]);

  useEffect(() => {
    if (!hydrated || mode === "loading") return;
    if (mode !== "authenticated") {
      router.replace("/weekly");
      return;
    }
    if (programMode !== "custom") {
      router.replace("/settings");
    }
  }, [hydrated, mode, programMode, router]);

  const plan = localWeek?.[activeDow] ?? null;
  const dateKey = weekDateKeys[activeDow] ?? "";

  const exerciseCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    if (!localWeek) return counts;
    for (let dow = 0; dow < 7; dow++) {
      const day = localWeek[dow];
      counts[dow] = day ? countPlannedExercises(day) : 0;
    }
    return counts;
  }, [localWeek]);

  const requestDayChange = useCallback(
    (dow: number) => {
      if (dow === activeDow) return;
      if (dirty) {
        setPendingDow(dow);
        return;
      }
      setActiveDow(dow);
      setSaveError(null);
    },
    [activeDow, dirty],
  );

  const persistDay = useCallback(
    async (edited: DayPlan, options?: { advance?: boolean }) => {
      setSaving(true);
      setSaveError(null);
      try {
        await saveCustomDayPlan(dateKey, edited);
        bumpTrainingWeekPlans();
        setLocalWeek((prev) =>
          prev ? { ...prev, [activeDow]: cloneDayPlan(edited) } : prev,
        );
        setDirty(false);
        if (options?.advance && activeDow < 6) {
          setActiveDow(activeDow + 1);
        }
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Could not save this day";
        setSaveError(message);
        toastSaveError("workout plan", e);
      } finally {
        setSaving(false);
      }
    },
    [activeDow, dateKey],
  );

  async function handleResetDay() {
    setSaving(true);
    setSaveError(null);
    try {
      const fresh = await resetDayToGenerated(dateKey);
      bumpTrainingWeekPlans();
      setLocalWeek((prev) =>
        prev ? { ...prev, [activeDow]: cloneDayPlan(fresh) } : prev,
      );
      setDirty(false);
      setEditorKey((k) => k + 1);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Could not reset this day";
      setSaveError(message);
      toastSaveError("workout plan", e);
    } finally {
      setSaving(false);
    }
  }

  function discardPendingSwitch() {
    setPendingDow(null);
    setDirty(false);
    if (pendingDow != null) {
      setActiveDow(pendingDow);
      setSaveError(null);
    }
  }

  if (!hydrated || mode === "loading" || programMode !== "custom") {
    return (
      <div className="py-12 space-y-3">
        <PlanCardSkeleton />
        <PlanCardSkeleton />
      </div>
    );
  }

  if (loading || !localWeek || !plan) {
    return (
      <div className="py-6 space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Build your week</h1>
        <PlanCardSkeleton />
        <PlanCardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 space-y-4">
        <p className="text-sm text-red-400">{error}</p>
        <Link href="/weekly" className="text-sm font-medium text-accent">
          Back to Weekly
        </Link>
      </div>
    );
  }

  const nextDow = activeDow < 6 ? activeDow + 1 : null;
  const nextLabel = nextDow != null ? DAY_ABBRS[nextDow] : null;

  return (
    <div className="py-6 space-y-5 pb-24">
      <div>
        <Link
          href="/weekly"
          className="text-sm font-medium text-accent hover:text-accent/80"
        >
          ← Weekly overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Build your week</h1>
        <p className="mt-1 text-sm text-muted">
          Step through each day — add rounds and exercises, then save. Day{" "}
          {activeDow + 1} of 7 · {plan.name}
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {DAY_ABBRS.map((label, dow) => {
          const selected = dow === activeDow;
          const count = exerciseCounts[dow] ?? 0;
          const isToday =
            weekDateKeys[dow] === formatLocalDateKey(new Date());
          return (
            <button
              key={label}
              type="button"
              onClick={() => requestDayChange(dow)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-center transition-colors ${
                selected
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              <span className="block text-[10px] font-semibold uppercase">
                {label}
              </span>
              <span className="mt-0.5 block text-[11px]">
                {count > 0 ? `${count} ex` : "—"}
              </span>
              {isToday && (
                <span className="mt-0.5 block text-[9px] text-accent">Today</span>
              )}
            </button>
          );
        })}
      </div>

      {pendingDow != null && (
        <SurfaceCard className="border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
          <p className="text-sm text-foreground">
            Save changes to {DAY_ABBRS[activeDow]} before switching to{" "}
            {DAY_ABBRS[pendingDow]}?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                const toSave = latestDraftRef.current ?? plan;
                void persistDay(toSave, { advance: false }).then(() => {
                  setActiveDow(pendingDow);
                  setPendingDow(null);
                });
              }}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white"
            >
              Save & switch
            </button>
            <button
              type="button"
              onClick={discardPendingSwitch}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted"
            >
              Discard & switch
            </button>
            <button
              type="button"
              onClick={() => setPendingDow(null)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground"
            >
              Keep editing
            </button>
          </div>
        </SurfaceCard>
      )}

      {saveError && (
        <p className="text-sm text-red-400 text-center" role="alert">
          {saveError}
        </p>
      )}

      <WorkoutPlanEditor
        key={`${activeDow}-${dateKey}-${editorKey}`}
        initialPlan={plan}
        isCustomWeek
        saving={saving}
        embedded
        saveLabel={nextLabel ? `Save & continue to ${nextLabel}` : "Save this day"}
        onDirtyChange={handleDraftChange}
        onSave={(edited) => {
          if (nextDow != null) {
            void persistDay(edited, { advance: true });
          } else {
            void persistDay(edited);
          }
        }}
        onCancel={() => router.push("/weekly")}
        onResetDay={() => void handleResetDay()}
      />

      <SurfaceCard className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          {activeDow > 0
            ? `Previous: ${DAY_ABBRS[activeDow - 1]}`
            : "Start of week"}
        </p>
        <div className="flex flex-wrap gap-2">
          {activeDow > 0 && (
            <button
              type="button"
              disabled={saving}
              onClick={() => requestDayChange(activeDow - 1)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
            >
              ← {DAY_ABBRS[activeDow - 1]}
            </button>
          )}
          {nextDow != null ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => requestDayChange(nextDow)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
            >
              {DAY_ABBRS[nextDow]} →
            </button>
          ) : (
            <Link
              href="/weekly"
              className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/90"
            >
              Done — view week
            </Link>
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
