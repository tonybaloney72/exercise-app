"use client";

import { create } from "zustand";

export type TrainingWeekRefreshReason =
  | "dislike"
  | "favorite"
  | "equipment"
  | "program"
  | "reset";

const MESSAGES: Record<TrainingWeekRefreshReason, string> = {
  dislike:
    "Your training week was updated to reflect exercise preferences. Workouts you already finished are unchanged.",
  favorite:
    "Your training week was updated to favor exercises you starred in the Library. Workouts you already finished are unchanged.",
  equipment:
    "Your training week was updated for your equipment selection. Workouts you already finished are unchanged.",
  program:
    "Your training week was updated for your program focus and round density. Workouts you already finished are unchanged.",
  reset:
    "Your training week was reset to the auto-generated plan. Custom edits were removed. Finished workouts are unchanged.",
};

type TrainingWeekRefreshState = {
  /** Bumped after persisted week regenerates so plan hooks refetch. */
  planRevision: number;
  notice: { reason: TrainingWeekRefreshReason; message: string } | null;
  notifyRefreshed: (reason: TrainingWeekRefreshReason) => void;
  bumpPlanRevision: () => void;
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

    bumpPlanRevision: () =>
      set((s) => ({
        planRevision: s.planRevision + 1,
      })),

    dismissNotice: () => set({ notice: null }),
  }),
);
