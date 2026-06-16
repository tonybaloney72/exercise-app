"use client";

import { useCallback, useEffect, useState } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import { getWorkoutDayTemplateRepo } from "@/lib/repos";
import {
  applyTemplateToDayPlan,
  dayPlanToTemplateSnapshot,
  MAX_WORKOUT_DAY_TEMPLATES,
  normalizeTemplateName,
  sortTemplatesByName,
} from "@/lib/workoutDayTemplates";
import { toastSaveError } from "@/utils/saveErrorToast";
import { useAuthStore } from "@/stores/useAuthStore";
import type { DayPlan, WorkoutDayTemplate } from "@/types";
import { toast } from "sonner";

type Props = {
  draft: DayPlan;
  disabled?: boolean;
  onApply: (plan: DayPlan) => void;
};

export default function WorkoutDayTemplateToolbar({
  draft,
  disabled = false,
  onApply,
}: Props) {
  const authMode = useAuthStore((s) => s.mode);
  const [saveOpen, setSaveOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [name, setName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templates, setTemplates] = useState<WorkoutDayTemplate[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshTemplates = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await getWorkoutDayTemplateRepo(authMode).listAll();
      setTemplates(sortTemplatesByName(list));
    } catch (e) {
      toastSaveError("workout templates", e);
      setTemplates([]);
    } finally {
      setLoadingList(false);
    }
  }, [authMode]);

  useEffect(() => {
    if (!pickOpen) return;
    void refreshTemplates();
  }, [pickOpen, refreshTemplates]);

  async function handleSaveTemplate() {
    const label = normalizeTemplateName(name);
    if (!label) {
      toast.error("Enter a template name");
      return;
    }
    setSavingTemplate(true);
    try {
      await getWorkoutDayTemplateRepo(authMode).save({
        name: label,
        plan: dayPlanToTemplateSnapshot(draft),
      });
      toast.success("Template saved", {
        description: `"${label}" is ready to apply on other days.`,
      });
      setSaveOpen(false);
      setName("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save template";
      if (msg.includes("limit")) {
        toast.error(`Template limit (${MAX_WORKOUT_DAY_TEMPLATES}) reached`);
      } else {
        toastSaveError("workout template", e);
      }
    } finally {
      setSavingTemplate(false);
    }
  }

  function handleApply(template: WorkoutDayTemplate) {
    const next = applyTemplateToDayPlan(draft, template.plan);
    onApply(next);
    setPickOpen(false);
    toast.success("Template applied", {
      description: `Loaded "${template.name}". Tap Save this day when ready.`,
    });
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await getWorkoutDayTemplateRepo(authMode).delete(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } catch (e) {
      toastSaveError("workout template", e);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-surface px-4 py-3 space-y-2">
        <p className="text-xs font-medium text-muted">Templates</p>
        <p className="text-sm text-muted leading-snug">
          Save this day&apos;s rounds, stretches, and cardio to reuse on other days.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setName("");
              setSaveOpen(true);
            }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
          >
            Save as template
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setPickOpen(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
          >
            Apply template
          </button>
        </div>
      </div>

      <BottomSheetModal
        open={saveOpen}
        onClose={() => !savingTemplate && setSaveOpen(false)}
        title="Save as template"
        hint="Name this workout structure (rounds, stretches, cardio)."
        ariaLabel="Save workout template"
        footer={
          <div className="flex gap-3 px-4 pb-4">
            <button
              type="button"
              disabled={savingTemplate}
              onClick={() => setSaveOpen(false)}
              className="flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={savingTemplate}
              onClick={() => void handleSaveTemplate()}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {savingTemplate ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <label className="block px-4 py-3">
          <span className="text-xs font-medium text-muted">Template name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="e.g. Upper + core"
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
      </BottomSheetModal>

      <BottomSheetModal
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        title="Apply template"
        hint="Replaces rounds, stretches, and cardio on this day. Name and theme stay the same."
        ariaLabel="Choose workout template"
        bodyClassName="overflow-y-auto px-2 py-2 max-h-[min(55vh,400px)]"
      >
        {loadingList ? (
          <p className="px-3 py-6 text-sm text-muted text-center">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted text-center">
            No templates yet. Use Save as template first.
          </p>
        ) : (
          <ul>
            {templates.map((template) => {
              const roundCount = template.plan.rounds.length;
              const exerciseCount = template.plan.rounds.reduce(
                (n, r) => n + r.exercises.length,
                0,
              );
              return (
                <li
                  key={template.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1"
                >
                  <button
                    type="button"
                    onClick={() => handleApply(template)}
                    className="flex-1 min-w-0 rounded-lg px-2 py-3 text-left transition-colors hover:bg-surface-hover"
                  >
                    <p className="text-sm font-medium text-foreground truncate">
                      {template.name}
                    </p>
                    <p className="text-xs text-muted">
                      {roundCount} round{roundCount === 1 ? "" : "s"} ·{" "}
                      {exerciseCount} exercise
                      {exerciseCount === 1 ? "" : "s"}
                      {template.plan.cardioActivities?.length
                        ? ` · ${template.plan.cardioActivities.length} cardio`
                        : ""}
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === template.id}
                    onClick={() => void handleDelete(template.id)}
                    className="shrink-0 rounded-md px-2 py-1 text-xs text-muted hover:text-foreground disabled:opacity-50"
                  >
                    {deletingId === template.id ? "…" : "Delete"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </BottomSheetModal>
    </>
  );
}
