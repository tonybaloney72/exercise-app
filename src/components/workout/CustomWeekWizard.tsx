"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PlanCardSkeleton from "@/components/common/PlanCardSkeleton";
import BackNavLink from "@/components/common/BackNavLink";
import SurfaceCard from "@/components/common/SurfaceCard";
import WeekBlueprintPresetPicker from "@/components/week/WeekBlueprintPresetPicker";
import WeekWizardShell, {
  WeekWizardNavFooter,
} from "@/components/week/WeekWizardShell";
import WorkoutPlanEditor from "@/components/workout/WorkoutPlanEditor";
import { countPlannedExercises } from "@/lib/dayPlanDraft";
import type { WeekBlueprintPresetId } from "@/lib/weekBlueprintPresets";
import {
  cloneDayPlan,
  resetDayToGenerated,
  saveCustomDayPlan,
  seedManualWeekFromBlueprint,
} from "@/lib/trainingWeekCustomize";
import { resolveBlueprintForManualSeed } from "@/lib/manualWeekSeed";
import { isGuidedCustomSettings } from "@/lib/weekBlueprintPolicy";
import { bumpTrainingWeekPlansAfterCustomSave } from "@/adapters/bumpTrainingWeekPlansAfterCustomSave";
import { bumpTrainingWeekPlansFromDb } from "@/lib/trainingWeekRefresh";
import { WEEK_DAY_ABBRS } from "@/lib/weekWizardConstants";
import { toastSaveError } from "@/utils/saveErrorToast";
import { useTrainingWeekPlans } from "@/hooks/useTrainingWeekPlans";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { DayPlan } from "@/types";
import type { TrainingWeekDays } from "@/lib/repos";
import { getWeekDateKeys } from "@/utils/weekCalendar";
import { formatLocalDateKey } from "@/utils/localDateKey";

function weekDatesFromKeys(dateKeys: string[]): Date[] {
  return dateKeys.map((key) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y!, m! - 1, d!);
  });
}

function manualDayStripLabel(plan: DayPlan | undefined): string {
  if (!plan) return "-";
  const count = countPlannedExercises(plan);
  if (count > 0) return `${count} ex`;
  if (plan.rounds.length > 0) return `${plan.rounds.length} rnd`;
  return "-";
}

export default function CustomWeekWizard() {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const settings = useSettingsStore();
  const programMode = settings.programMode;
  const customBuildStyle = settings.customBuildStyle;
  const hydrated = settings.hydrated;

  const weekDateKeys = useMemo(() => getWeekDateKeys(), []);
  const weekDates = useMemo(
    () => weekDatesFromKeys(weekDateKeys),
    [weekDateKeys],
  );
  const { weekByDow, loading, error } = useTrainingWeekPlans(weekDates);

  const [activeDow, setActiveDow] = useState(0);
  const [localWeek, setLocalWeek] = useState<TrainingWeekDays | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
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
      return;
    }
    if (isGuidedCustomSettings({ programMode, customBuildStyle })) {
      router.replace("/weekly/build-guided");
    }
  }, [customBuildStyle, hydrated, mode, programMode, router]);

  const plan = localWeek?.[activeDow] ?? null;
  const dateKey = weekDateKeys[activeDow] ?? "";
  const hasSavedBlueprint = Boolean(settings.weekBlueprintCustomized);

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
        const mergedWeek = await saveCustomDayPlan(dateKey, edited);
        await bumpTrainingWeekPlansAfterCustomSave(dateKey, mergedWeek);
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
      await bumpTrainingWeekPlansFromDb();
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

  async function applyBlueprintSeed(presetId?: WeekBlueprintPresetId) {
    setSeeding(true);
    setSeedError(null);
    setSaveError(null);
    try {
      const blueprint = resolveBlueprintForManualSeed(settings, presetId);
      const week = await seedManualWeekFromBlueprint(
        weekDateKeys[0] ?? formatLocalDateKey(new Date()),
        blueprint,
      );
      await bumpTrainingWeekPlansFromDb();
      setLocalWeek(week);
      setDirty(false);
      setEditorKey((k) => k + 1);
      setActiveDow(0);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Could not generate from template";
      setSeedError(message);
      toastSaveError("week template", e);
    } finally {
      setSeeding(false);
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
        <BackNavLink label="Back" />
      </div>
    );
  }

  const nextDow = activeDow < 6 ? activeDow + 1 : null;
  const nextLabel = nextDow != null ? WEEK_DAY_ABBRS[nextDow] : null;
  const isToday = weekDateKeys[activeDow] === formatLocalDateKey(new Date());

  return (
    <WeekWizardShell
      title="Build your week"
      subtitle={`Day ${activeDow + 1} of 7 · ${WEEK_DAY_ABBRS[activeDow]}${isToday ? " · Today" : ""} · ${plan.name}`}
      activeDow={activeDow}
      weekDateKeys={weekDateKeys}
      stripSecondary={(dow) => manualDayStripLabel(localWeek[dow])}
      onSelectDow={requestDayChange}
      footer={
        <WeekWizardNavFooter
          activeDow={activeDow}
          prevDisabled={saving || seeding}
          nextDisabled={saving || seeding}
          onPrev={
            activeDow > 0 ? () => requestDayChange(activeDow - 1) : undefined
          }
          onNext={() => {
            if (nextDow != null) {
              requestDayChange(nextDow);
            } else {
              router.push("/weekly");
            }
          }}
          nextLabel={
            nextDow != null
              ? `${WEEK_DAY_ABBRS[nextDow]} →`
              : "Done - view week"
          }
          nextPrimary={nextDow != null}
        />
      }
    >
      <WeekBlueprintPresetPicker
        hasSavedBlueprint={hasSavedBlueprint}
        busy={seeding || saving}
        onApplyPreset={(id) => void applyBlueprintSeed(id)}
        onApplySavedBlueprint={() => void applyBlueprintSeed()}
      />

      {seedError ? (
        <p className="text-sm text-red-400 text-center" role="alert">
          {seedError}
        </p>
      ) : null}

      <p className="text-xs text-muted text-center">
        Prefer structure over picking exercises?{" "}
        <Link
          href="/weekly/build-guided"
          className="text-accent hover:underline"
        >
          Switch to guided week
        </Link>
      </p>

      {pendingDow != null && (
        <SurfaceCard className="border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
          <p className="text-sm text-foreground">
            Save changes to {WEEK_DAY_ABBRS[activeDow]} before switching to{" "}
            {WEEK_DAY_ABBRS[pendingDow]}?
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
        saveLabel={
          nextLabel ? `Save & continue to ${nextLabel}` : "Save this day"
        }
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

      {nextDow == null ? (
        <Link
          href="/weekly"
          className="block w-full rounded-xl border border-border py-3 text-center text-sm font-semibold text-foreground hover:bg-surface-hover"
        >
          Done - view week
        </Link>
      ) : null}
    </WeekWizardShell>
  );
}
