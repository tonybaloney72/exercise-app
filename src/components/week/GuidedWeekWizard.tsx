"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PlanCardSkeleton from "@/components/common/PlanCardSkeleton";
import SurfaceCard from "@/components/common/SurfaceCard";
import GuidedDayBlueprintEditor from "@/components/week/GuidedDayBlueprintEditor";
import {
  describeDayBlueprint,
  shortDayBlueprintLabel,
} from "@/lib/weekBlueprintDraft";
import {
  resolveWeekBlueprint,
  sanitizeWeekBlueprint,
} from "@/lib/weekBlueprint";
import { isGuidedCustomSettings } from "@/lib/weekBlueprintPolicy";
import { analyzeWeekBlueprint } from "@/lib/weekBlueprintWarnings";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { getWeekDateKeys } from "@/utils/weekCalendar";

const DAY_ABBRS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type WizardStep = "day" | "review";

export default function GuidedWeekWizard() {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const settings = useSettingsStore();
  const hydrated = settings.hydrated;

  const [step, setStep] = useState<WizardStep>("day");
  const [activeDow, setActiveDow] = useState(0);
  const [draft, setDraft] = useState(() =>
    sanitizeWeekBlueprint(settings.weekBlueprint),
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const weekDateKeys = useMemo(() => getWeekDateKeys(), []);
  const warnings = useMemo(() => analyzeWeekBlueprint(draft), [draft]);

  useEffect(() => {
    if (!hydrated) return;
    setDraft(sanitizeWeekBlueprint(resolveWeekBlueprint(settings)));
  }, [hydrated, settings.weekBlueprint, settings.weekBlueprintCustomized]);

  useEffect(() => {
    if (!hydrated || mode === "loading") return;
    if (mode !== "authenticated") {
      router.replace("/weekly");
      return;
    }
    if (!isGuidedCustomSettings(settings)) {
      router.replace("/settings");
    }
  }, [hydrated, mode, router, settings]);

  async function saveBlueprint() {
    setSaving(true);
    setSaveError(null);
    try {
      await settings.updateSettings({
        programMode: "custom",
        customBuildStyle: "guided",
        weekBlueprint: draft,
        weekBlueprintCustomized: true,
        weekBuilderMigrationAcknowledged: true,
      });
      router.push("/weekly");
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Could not save week plan");
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated || mode === "loading" || !isGuidedCustomSettings(settings)) {
    return (
      <div className="py-12 space-y-3">
        <PlanCardSkeleton />
        <PlanCardSkeleton />
      </div>
    );
  }

  const day = draft[activeDow] ?? {
    dayKind: "full_rest" as const,
    rounds: [],
  };

  if (step === "review") {
    const globalWarnings = warnings.filter((w) => w.dayOfWeek == null);
    return (
      <div className="py-6 space-y-5 pb-24">
        <div>
          <button
            type="button"
            onClick={() => setStep("day")}
            className="text-sm font-medium text-accent hover:text-accent/80"
          >
            ← Back to days
          </button>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            Review your week
          </h1>
          <p className="mt-1 text-sm text-muted">
            Save to regenerate exercises from this plan (future days and today
            if you have not started).
          </p>
        </div>

        {globalWarnings.length > 0 ? (
          <SurfaceCard className="border-amber-500/30 bg-amber-500/5 p-4 space-y-1">
            {globalWarnings.map((w) => (
              <p
                key={w.id}
                className="text-sm text-amber-700 dark:text-amber-300"
              >
                {w.message}
              </p>
            ))}
          </SurfaceCard>
        ) : null}

        <ul className="space-y-2">
          {DAY_ABBRS.map((label, dow) => (
            <li
              key={label}
              className="rounded-lg border border-border bg-surface-hover/40 px-3 py-2"
            >
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted mt-0.5">
                {describeDayBlueprint(
                  draft[dow] ?? { dayKind: "full_rest", rounds: [] },
                )}
              </p>
            </li>
          ))}
        </ul>

        {saveError ? (
          <p className="text-sm text-red-400 text-center" role="alert">
            {saveError}
          </p>
        ) : null}

        <button
          type="button"
          disabled={saving}
          onClick={() => void saveBlueprint()}
          className="w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/25 hover:bg-accent/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save week plan"}
        </button>
      </div>
    );
  }

  const isToday = weekDateKeys[activeDow] === formatLocalDateKey(new Date());

  return (
    <div className="py-6 space-y-5 pb-24">
      <div>
        <Link
          href="/settings"
          className="text-sm font-medium text-accent hover:text-accent/80"
        >
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          Plan your week
        </h1>
        <p className="mt-1 text-sm text-muted">
          Day {activeDow + 1} of 7 · {DAY_ABBRS[activeDow]}
          {isToday ? " · Today" : ""}
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {DAY_ABBRS.map((label, dow) => {
          const selected = dow === activeDow;
          const dayDraft = draft[dow] ?? {
            dayKind: "full_rest" as const,
            rounds: [],
          };
          const isToday = weekDateKeys[dow] === formatLocalDateKey(new Date());
          return (
            <button
              key={label}
              type="button"
              onClick={() => setActiveDow(dow)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-center transition-colors ${
                selected
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              <span className="block text-caption font-semibold uppercase">
                {label}
              </span>
              <span className="mt-0.5 block text-xs">
                {shortDayBlueprintLabel(dayDraft)}
              </span>
              {isToday ? (
                <span className="mt-0.5 block text-[9px] text-accent">
                  Today
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <GuidedDayBlueprintEditor
        dayOfWeek={activeDow}
        day={day}
        blueprint={draft}
        warnings={warnings}
        onChange={setDraft}
      />

      <SurfaceCard className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap justify-between">
          {activeDow > 0 && (
            <button
              type="button"
              onClick={() => setActiveDow(activeDow - 1)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-hover"
            >
              ← {DAY_ABBRS[activeDow - 1]}
            </button>
          )}
          {activeDow < 6 ? (
            <button
              type="button"
              onClick={() => setActiveDow(activeDow + 1)}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/90"
            >
              {DAY_ABBRS[activeDow + 1]} →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep("review")}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/90"
            >
              Review week
            </button>
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
