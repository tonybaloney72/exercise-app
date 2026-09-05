"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import { routes } from "@/lib/appRoutes";
import { getWorkoutDayTemplateRepo } from "@/lib/repos";
import {
  applyTemplateToDayPlanWithMode,
  dayPlanToTemplateSnapshot,
  defaultTemplateApplyMode,
  MAX_WORKOUT_DAY_TEMPLATES,
  normalizeTemplateName,
  sortTemplatesByName,
  templateHasDayExtras,
  templatePlanSummary,
  type TemplateApplyMode,
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

const APPLY_MODE_OPTIONS: {
  mode: TemplateApplyMode;
  title: string;
  description: string;
}[] = [
  {
    mode: "replace_day",
    title: "Replace entire day",
    description: "Rounds, stretches, and cardio become this template.",
  },
  {
    mode: "append_rounds",
    title: "Append as new round(s)",
    description: "Keep this day; add the template rounds at the end.",
  },
  {
    mode: "replace_round",
    title: "Replace one round",
    description:
      "Swap one round on this day (multi-round templates insert in place).",
  },
];

function applyToastDescription(
  templateName: string,
  mode: TemplateApplyMode,
  replaceRoundIndex: number,
): string {
  if (mode === "append_rounds") {
    return `Appended "${templateName}". Tap Save this day when ready.`;
  }
  if (mode === "replace_round") {
    return `Replaced round ${replaceRoundIndex + 1} with "${templateName}". Tap Save this day when ready.`;
  }
  return `Loaded "${templateName}". Tap Save this day when ready.`;
}

export default function WorkoutDayTemplateToolbar({
  draft,
  disabled = false,
  onApply,
}: Props) {
  const authMode = useAuthStore((s) => s.mode);
  const [saveOpen, setSaveOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [pending, setPending] = useState<WorkoutDayTemplate | null>(null);
  const [applyMode, setApplyMode] =
    useState<TemplateApplyMode>("replace_day");
  const [replaceRoundIndex, setReplaceRoundIndex] = useState(0);
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

  function handleSelectTemplate(template: WorkoutDayTemplate) {
    setPending(template);
    setApplyMode(defaultTemplateApplyMode(template.plan));
    setReplaceRoundIndex(0);
    setPickOpen(false);
  }

  function handleConfirmApply() {
    if (!pending) return;
    const next = applyTemplateToDayPlanWithMode(draft, pending.plan, {
      mode: applyMode,
      replaceRoundIndex,
    });
    onApply(next);
    toast.success("Template applied", {
      description: applyToastDescription(
        pending.name,
        applyMode,
        replaceRoundIndex,
      ),
    });
    setPending(null);
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

  const dayRoundCount = draft.rounds.length;
  const modeHint =
    applyMode === "replace_day" && dayRoundCount > 0
      ? `Replace day will remove your current ${dayRoundCount} round${dayRoundCount === 1 ? "" : "s"}.`
      : applyMode === "append_rounds"
        ? "Stretches and cardio on this day stay as they are."
        : applyMode === "replace_round"
          ? "Stretches and cardio on this day stay as they are."
          : undefined;

  return (
    <>
      <div className="flex flex-col rounded-xl border border-border bg-surface px-4 py-3 gap-2">
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
          <Link
            href={routes.settingsTrainingTemplates}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover"
          >
            Manage
          </Link>
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
        hint="Choose a template, then how to merge it into this day."
        ariaLabel="Choose workout template"
        bodyClassName="overflow-y-auto px-2 py-2 max-h-[min(55vh,400px)]"
      >
        {loadingList ? (
          <p className="px-3 py-6 text-sm text-muted text-center">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted text-center">
            No templates yet. Create one in Settings → Training → Day templates,
            or Save as template here.
          </p>
        ) : (
          <ul>
            {templates.map((template) => {
              return (
                <li
                  key={template.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectTemplate(template)}
                    className="flex-1 min-w-0 rounded-lg px-2 py-3 text-left transition-colors hover:bg-surface-hover"
                  >
                    <p className="text-sm font-medium text-foreground truncate">
                      {template.name}
                    </p>
                    <p className="text-xs text-muted">
                      {templatePlanSummary(template.plan)}
                      {templateHasDayExtras(template.plan)
                        ? " · day extras"
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

      <BottomSheetModal
        open={pending != null}
        onClose={() => setPending(null)}
        title={pending ? `Apply “${pending.name}”` : "Apply template"}
        hint={
          pending
            ? `${templatePlanSummary(pending.plan)}. How should it merge into this day?`
            : undefined
        }
        ariaLabel="Choose how to apply template"
        footer={
          <div className="flex gap-3 px-4 pb-4">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-medium text-foreground hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmApply}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white hover:bg-accent/90"
            >
              Apply
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-2 px-4 py-3">
          <div
            className="flex flex-col gap-2"
            role="radiogroup"
            aria-label="Template apply mode"
          >
            {APPLY_MODE_OPTIONS.map((option) => {
              const selected = applyMode === option.mode;
              return (
                <button
                  key={option.mode}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setApplyMode(option.mode)}
                  className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                    selected
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface hover:bg-surface-hover"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">
                    {option.title}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>

          {applyMode === "replace_round" && dayRoundCount > 0 ? (
            <label className="mt-1 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">
                Round to replace
              </span>
              <select
                value={replaceRoundIndex}
                onChange={(e) => setReplaceRoundIndex(Number(e.target.value))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              >
                {draft.rounds.map((round, index) => (
                  <option key={round.roundNumber} value={index}>
                    Round {index + 1}
                    {round.exercises.length > 0
                      ? ` · ${round.exercises.length} exercise${round.exercises.length === 1 ? "" : "s"}`
                      : " · empty"}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {modeHint ? (
            <p className="text-xs text-muted leading-snug pt-1">{modeHint}</p>
          ) : null}
        </div>
      </BottomSheetModal>
    </>
  );
}
