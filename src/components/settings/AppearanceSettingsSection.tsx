"use client";

import ThemeModeSelector from "@/components/settings/ThemeModeSelector";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ThemeMode } from "@/types";

export default function AppearanceSettingsSection() {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <ThemeModeSelector
      value={themeMode}
      onChange={(mode: ThemeMode) => void updateSettings({ themeMode: mode })}
    />
  );
}
