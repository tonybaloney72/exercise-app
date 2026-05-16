"use client";

import { create } from "zustand";

export type TrainingWeekRefreshReason = "dislike" | "equipment";

const MESSAGES: Record<TrainingWeekRefreshReason, string> = {
  dislike:
    "Your training week was updated to reflect exercise preferences. Workouts you already finished are unchanged.",
  equipment:
    "Your training week was updated for your equipment selection. Workouts you already finished are unchanged.",
};

type TrainingWeekRefreshState = {
  /** Bumped after persisted week regenerates so plan hooks refetch. */
  planRevision: number;
  notice: { reason: TrainingWeekRefreshReason; message: string } | null;
  notifyRefreshed: (reason: TrainingWeekRefreshReason) => void;
  dismissNotice: () => void;
};

export const useTrainingWeekRefreshStore = create<TrainingWeekRefreshState>(
  (set) => ({
    planRevision: 0,
    notice: null,

    notifyRefreshed: (reason) =>
      set((s) => ({
        planRevision: s.planRevision + 1,
        notice: { reason, message: MESSAGES[reason] },
      })),

    dismissNotice: () => set({ notice: null }),
  }),
);
