"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useWeightStore } from "@/stores/useWeightStore";
import { useDocumentThemeSync } from "@/hooks/useEffectiveDarkMode";

/**
 * Loads persisted settings once auth is known, and keeps
 * `document.documentElement` in sync with `themeMode` (see globals.css).
 */
export default function AppSettingsSync() {
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.user?.id);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadExerciseSettings = useExerciseSettingsStore((s) => s.load);
  const loadExercisePreferences = useExercisePreferencesStore((s) => s.load);
  const loadWeight = useWeightStore((s) => s.load);

  useDocumentThemeSync();

  useEffect(() => {
    if (mode === "loading") return;
    void loadSettings();
    void loadExerciseSettings();
    void loadExercisePreferences();
    void loadWeight();
  }, [mode, userId, loadSettings, loadExerciseSettings, loadExercisePreferences, loadWeight]);

  return null;
}
