"use client";

import { create } from "zustand";
import { getWeightEntryRepo } from "@/lib/repos";
import { settingsHydrationKey } from "@/lib/settingsHydration";
import {
  isWeightRangePresetId,
  type WeightRangePresetId,
} from "@/lib/weightRangePresets";
import { upsertWeightEntry } from "@/lib/weightLog";
import { writeWeightToHealth } from "@/lib/health/appTrackedHealthWrite";
import { useAuthStore } from "@/stores/useAuthStore";
import type { WeightLogEntry } from "@/types";

const RANGE_PRESET_KEY = "exercise-app-weight-range-preset";

function readStoredRangePreset(): WeightRangePresetId {
  if (typeof window === "undefined") return "6mo";
  const stored = localStorage.getItem(RANGE_PRESET_KEY);
  return stored && isWeightRangePresetId(stored) ? stored : "6mo";
}

interface WeightState {
  entries: WeightLogEntry[];
  hydrated: boolean;
  hydratedForAuthKey: string | null;
  rangePreset: WeightRangePresetId;
  load: (options?: { force?: boolean }) => Promise<void>;
  upsert: (dateKey: string, weightLb: number) => Promise<void>;
  setRangePreset: (preset: WeightRangePresetId) => void;
}

export const useWeightStore = create<WeightState>((set, get) => ({
  entries: [],
  hydrated: false,
  hydratedForAuthKey: null,
  rangePreset: readStoredRangePreset(),

  load: async (options) => {
    const auth = useAuthStore.getState();
    if (auth.mode === "loading") return;

    const authKey = settingsHydrationKey(auth.mode, auth.user?.id);
    if (!authKey) return;

    if (!options?.force && get().hydratedForAuthKey === authKey) return;

    const entries = await getWeightEntryRepo(auth.mode).list();

    const currentKey = settingsHydrationKey(
      useAuthStore.getState().mode,
      useAuthStore.getState().user?.id,
    );
    if (currentKey !== authKey) return;

    if (!options?.force && get().hydratedForAuthKey === authKey) return;

    set({ entries, hydrated: true, hydratedForAuthKey: authKey });
  },

  upsert: async (dateKey, weightLb) => {
    const mode = useAuthStore.getState().mode;
    const repo = getWeightEntryRepo(mode);
    await repo.upsert(dateKey, weightLb);
    set((state) => ({
      entries: upsertWeightEntry(state.entries, dateKey, weightLb),
    }));
    void writeWeightToHealth({ weightLb }).catch(() => {
      // Optional mirror to Health Connect.
    });
  },

  setRangePreset: (preset) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(RANGE_PRESET_KEY, preset);
    }
    set({ rangePreset: preset });
  },
}));
