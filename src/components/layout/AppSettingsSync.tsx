"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useWeightStore } from "@/stores/useWeightStore";

/**
 * Loads persisted settings once auth is known, and keeps
 * `document.documentElement` in sync with `darkMode` (see globals.css).
 */
export default function AppSettingsSync() {
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.user?.id);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadExerciseSettings = useExerciseSettingsStore((s) => s.load);
  const loadExercisePreferences = useExercisePreferencesStore((s) => s.load);
  const loadWeight = useWeightStore((s) => s.load);

  useEffect(() => {
    if (mode === "loading") return;
    void loadSettings();
    void loadExerciseSettings();
    void loadExercisePreferences();
    void loadWeight();
  }, [mode, userId, loadSettings, loadExerciseSettings, loadExercisePreferences, loadWeight]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", "light");
    }
  }, [darkMode]);

  return null;
}
