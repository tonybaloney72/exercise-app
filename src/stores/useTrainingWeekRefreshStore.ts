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
    "Today and the rest of this week were updated for your exercise preferences. Past days and finished workouts are unchanged. If you already started today’s workout, today’s plan was left as-is.",
  favorite:
    "Today and the rest of this week now favor your starred exercises. Past days and finished workouts are unchanged. If you already started today’s workout, today’s plan was left as-is.",
  equipment:
    "Today and the rest of this week were updated for your equipment. Past days and finished workouts are unchanged. If you already started today’s workout, today’s plan was left as-is.",
  program:
    "Today and the rest of this week were updated for program focus, round density, or default stretches. Past days and finished workouts are unchanged. If you already started today’s workout, today’s plan was left as-is.",
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
