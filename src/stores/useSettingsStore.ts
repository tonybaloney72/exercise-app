"use client";

import { create } from "zustand";
import type { UserSettings } from "@/types";

interface SettingsState extends UserSettings {
  updateSettings: (partial: Partial<UserSettings>) => void;
  loadSettings: () => void;
}

const DEFAULTS: UserSettings = {
  currentPushUpMax: 13,
  currentJogDistance: 1.3,
  restBetweenRounds: 90,
  darkMode: true,
};

function loadFromStorage(): UserSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem("exercise-app-settings");
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function saveToStorage(settings: UserSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem("exercise-app-settings", JSON.stringify(settings));
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,

  updateSettings: (partial) => {
    const current = get();
    const updated: UserSettings = {
      currentPushUpMax: "currentPushUpMax" in partial ? partial.currentPushUpMax : current.currentPushUpMax,
      currentJogDistance: "currentJogDistance" in partial ? partial.currentJogDistance : current.currentJogDistance,
      currentJogBestTimeSeconds: "currentJogBestTimeSeconds" in partial ? partial.currentJogBestTimeSeconds : current.currentJogBestTimeSeconds,
      restBetweenRounds: partial.restBetweenRounds ?? current.restBetweenRounds,
      weekStartDate: partial.weekStartDate ?? current.weekStartDate,
      darkMode: partial.darkMode ?? current.darkMode,
    };
    saveToStorage(updated);
    set(updated);
  },

  loadSettings: () => {
    set(loadFromStorage());
  },
}));
