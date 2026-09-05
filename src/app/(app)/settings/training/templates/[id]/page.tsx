"use client";

import { useParams } from "next/navigation";
import WorkoutDayTemplateEditorPage from "@/components/settings/WorkoutDayTemplateEditorPage";
import BackNavLink from "@/components/common/BackNavLink";
import { routes } from "@/lib/appRoutes";

export default function EditWorkoutDayTemplatePage() {
  const params = useParams();
  const templateId = typeof params.id === "string" ? params.id : "";

  if (!templateId) {
    return (
      <div className="flex flex-col py-8 gap-4 px-2 text-center">
        <p className="text-sm text-muted">Invalid template.</p>
        <BackNavLink fallbackHref={routes.settingsTrainingTemplates} />
      </div>
    );
  }

  return (
    <WorkoutDayTemplateEditorPage mode="edit" templateId={templateId} />
  );
}
