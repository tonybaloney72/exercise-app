"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";

/**
 * Loads persisted settings once auth is known, and keeps
 * `document.documentElement` in sync with `darkMode` (see globals.css).
 */
export default function AppSettingsSync() {
  const mode = useAuthStore((s) => s.mode);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadExerciseSettings = useExerciseSettingsStore((s) => s.load);
  const loadExercisePreferences = useExercisePreferencesStore((s) => s.load);

  useEffect(() => {
    if (mode === "loading") return;
    void loadSettings();
    void loadExerciseSettings();
    void loadExercisePreferences();
  }, [mode, loadSettings, loadExerciseSettings, loadExercisePreferences]);

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
