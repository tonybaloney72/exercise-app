"use client";

import ExpertiseByGroupEditor from "@/components/settings/ExpertiseByGroupEditor";
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function ExerciseDifficultySettingsSection() {
  const settings = useSettingsStore();

  return (
    <ExpertiseByGroupEditor
      byGroup={settings.expertiseByGroup}
      onChange={(expertiseByGroup) => {
        void settings.updateSettings({ expertiseByGroup });
      }}
    />
  );
}
