"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import EmptyState from "@/components/common/EmptyState";
import SettingsSubpageLayout from "@/components/settings/SettingsSubpageLayout";
import { routes } from "@/lib/appRoutes";
import { getWorkoutDayTemplateRepo } from "@/lib/repos";
import {
  MAX_WORKOUT_DAY_TEMPLATES,
  normalizeTemplateName,
  sortTemplatesByName,
  templatePlanSummary,
} from "@/lib/workoutDayTemplates";
import { toastSaveError } from "@/utils/saveErrorToast";
import { useAuthStore } from "@/stores/useAuthStore";
import type { WorkoutDayTemplate } from "@/types";
import { toast } from "sonner";

export default function WorkoutDayTemplatesListPage() {
  const authMode = useAuthStore((s) => s.mode);
  const [templates, setTemplates] = useState<WorkoutDayTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<WorkoutDayTemplate | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getWorkoutDayTemplateRepo(authMode).listAll();
      setTemplates(sortTemplatesByName(list));
    } catch (e) {
      toastSaveError("workout templates", e);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [authMode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  async function handleDuplicate(template: WorkoutDayTemplate) {
    setDuplicatingId(template.id);
    try {
      const baseName = normalizeTemplateName(`${template.name} copy`) ?? "Copy";
      const saved = await getWorkoutDayTemplateRepo(authMode).save({
        name: baseName,
        plan: template.plan,
      });
      setTemplates((prev) => sortTemplatesByName([saved, ...prev]));
      toast.success("Template duplicated", {
        description: `"${saved.name}"`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not duplicate";
      if (msg.includes("limit")) {
        toast.error(`Template limit (${MAX_WORKOUT_DAY_TEMPLATES}) reached`);
      } else {
        toastSaveError("workout template", e);
      }
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleRename() {
    if (!renameTarget) return;
    const label = normalizeTemplateName(renameValue);
    if (!label) {
      toast.error("Enter a template name");
      return;
    }
    setRenaming(true);
    try {
      const saved = await getWorkoutDayTemplateRepo(authMode).save({
        id: renameTarget.id,
        name: label,
        plan: renameTarget.plan,
      });
      setTemplates((prev) =>
        sortTemplatesByName(
          prev.map((t) => (t.id === saved.id ? saved : t)),
        ),
      );
      setRenameTarget(null);
      toast.success("Template renamed");
    } catch (e) {
      toastSaveError("workout template", e);
    } finally {
      setRenaming(false);
    }
  }

  const atLimit = templates.length >= MAX_WORKOUT_DAY_TEMPLATES;

  return (
    <SettingsSubpageLayout
      title="Day templates"
      hint="Reusable day layouts for Edit Day — rounds, stretches, and cardio."
      backHref={routes.settingsTraining}
    >
      <div className="flex flex-col gap-4">
        {atLimit ? (
          <p className="text-xs text-muted text-center">
            Limit reached ({MAX_WORKOUT_DAY_TEMPLATES}). Delete one to add
            another.
          </p>
        ) : (
          <Link
            href={routes.settingsTrainingTemplateNew}
            className="w-full rounded-xl bg-accent py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98]"
          >
            Add template
          </Link>
        )}

        {loading ? (
          <p className="text-sm text-muted text-center py-8">Loading…</p>
        ) : templates.length === 0 ? (
          <EmptyState
            title="No templates yet"
            description="Create a day layout here, or use Save as template while editing a day."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {templates.map((template) => (
              <li
                key={template.id}
                className="rounded-xl border border-border bg-surface px-3 py-3"
              >
                <Link
                  href={routes.settingsTrainingTemplate(template.id)}
                  className="block min-w-0 rounded-lg px-1 py-1 transition-colors hover:bg-surface-hover"
                >
                  <p className="text-sm font-medium text-foreground truncate">
                    {template.name}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {templatePlanSummary(template.plan)}
                  </p>
                </Link>
                <div className="mt-2 flex flex-wrap gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRenameTarget(template);
                      setRenameValue(template.name);
                    }}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    disabled={atLimit || duplicatingId === template.id}
                    onClick={() => void handleDuplicate(template)}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
                  >
                    {duplicatingId === template.id ? "…" : "Duplicate"}
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === template.id}
                    onClick={() => void handleDelete(template.id)}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover disabled:opacity-50"
                  >
                    {deletingId === template.id ? "…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomSheetModal
        open={renameTarget != null}
        onClose={() => !renaming && setRenameTarget(null)}
        title="Rename template"
        ariaLabel="Rename workout template"
        footer={
          <div className="flex gap-3 px-4 pb-4">
            <button
              type="button"
              disabled={renaming}
              onClick={() => setRenameTarget(null)}
              className="flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={renaming}
              onClick={() => void handleRename()}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {renaming ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <label className="block px-4 py-3">
          <span className="text-xs font-medium text-muted">Template name</span>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            maxLength={80}
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
      </BottomSheetModal>
    </SettingsSubpageLayout>
  );
}
