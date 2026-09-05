"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SettingsSubpageLayout from "@/components/settings/SettingsSubpageLayout";
import WorkoutPlanEditor from "@/components/workout/WorkoutPlanEditor";
import { routes } from "@/lib/appRoutes";
import { getWorkoutDayTemplateRepo } from "@/lib/repos";
import {
  dayPlanToTemplateSnapshot,
  emptyWorkoutDayTemplateSnapshot,
  normalizeTemplateName,
  templateToEditorDayPlan,
} from "@/lib/workoutDayTemplates";
import { toastSaveError } from "@/utils/saveErrorToast";
import { useAuthStore } from "@/stores/useAuthStore";
import type { DayPlan, WorkoutDayTemplate } from "@/types";
import { toast } from "sonner";

type Props =
  | { mode: "new" }
  | { mode: "edit"; templateId: string };

export default function WorkoutDayTemplateEditorPage(props: Props) {
  const router = useRouter();
  const authMode = useAuthStore((s) => s.mode);
  const templateId = props.mode === "edit" ? props.templateId : null;
  const [name, setName] = useState("");
  const [initialPlan, setInitialPlan] = useState<DayPlan | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [loading, setLoading] = useState(props.mode === "edit");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<WorkoutDayTemplate | null>(null);

  const goBack = useCallback(() => {
    router.push(routes.settingsTrainingTemplates);
  }, [router]);

  useEffect(() => {
    if (templateId == null) {
      setName("");
      setInitialPlan(
        templateToEditorDayPlan("", emptyWorkoutDayTemplateSnapshot()),
      );
      setExisting(null);
      setLoadError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const list = await getWorkoutDayTemplateRepo(authMode).listAll();
        if (cancelled) return;
        const found = list.find((t) => t.id === templateId);
        if (!found) {
          setLoadError("Template not found.");
          setInitialPlan(null);
          return;
        }
        setExisting(found);
        setName(found.name);
        setInitialPlan(templateToEditorDayPlan(found.name, found.plan));
      } catch (e) {
        if (cancelled) return;
        setLoadError(
          e instanceof Error ? e.message : "Could not load template",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authMode, templateId]);

  function handleReset() {
    setInitialPlan(
      templateToEditorDayPlan(name, emptyWorkoutDayTemplateSnapshot()),
    );
    setEditorKey((k) => k + 1);
  }

  async function handleSave(plan: DayPlan) {
    const label = normalizeTemplateName(name);
    if (!label) {
      toast.error("Enter a template name");
      return;
    }
    setSaving(true);
    try {
      const saved = await getWorkoutDayTemplateRepo(authMode).save({
        id: templateId ?? undefined,
        name: label,
        plan: dayPlanToTemplateSnapshot(plan),
      });
      toast.success(
        templateId == null ? "Template created" : "Template saved",
        { description: `"${saved.name}" is ready to apply on Edit Day.` },
      );
      if (templateId == null) {
        router.replace(routes.settingsTrainingTemplate(saved.id));
      } else {
        setExisting(saved);
        setName(saved.name);
        setInitialPlan(templateToEditorDayPlan(saved.name, saved.plan));
        setEditorKey((k) => k + 1);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save template";
      if (msg.includes("limit")) {
        toast.error("Template limit reached");
      } else {
        toastSaveError("workout template", e);
      }
    } finally {
      setSaving(false);
    }
  }

  const title = templateId == null ? "New template" : "Edit template";
  const hint =
    templateId == null
      ? "Build a reusable day layout (rounds, stretches, cardio)."
      : existing
        ? `Editing "${existing.name}"`
        : "Update this day layout.";

  return (
    <SettingsSubpageLayout
      title={title}
      hint={hint}
      backHref={routes.settingsTrainingTemplates}
    >
      {loading ? (
        <p className="text-sm text-muted text-center py-8">Loading…</p>
      ) : loadError ? (
        <div className="flex flex-col gap-3 items-center py-8">
          <p className="text-sm text-foreground text-center">{loadError}</p>
          <button
            type="button"
            onClick={goBack}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            Back to templates
          </button>
        </div>
      ) : initialPlan ? (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Template name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="e.g. Upper + core"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
          <WorkoutPlanEditor
            key={editorKey}
            initialPlan={initialPlan}
            isCustomWeek
            saving={saving}
            embedded
            saveLabel="Save template"
            showTemplateToolbar={false}
            resetHint="Clear rounds, stretches, and cardio on this template."
            resetButtonLabel="Clear template"
            resetConfirmLabel="Yes, clear template"
            onSave={(plan) => void handleSave(plan)}
            onCancel={goBack}
            onResetDay={handleReset}
          />
        </div>
      ) : null}
    </SettingsSubpageLayout>
  );
}
