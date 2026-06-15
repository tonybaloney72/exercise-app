"use client";

import { create } from "zustand";
import type { TrainingWeekRefreshReason } from "@/core";
import { toast } from "sonner";

/** One line each - full policy lives in docs; toast is a quick confirmation only. */
const TOAST_MESSAGE: Record<TrainingWeekRefreshReason, string> = {
  dislike: "Dislikes applied to today and the rest of this week.",
  favorite: "Favorites applied to today and the rest of this week.",
  equipment: "Equipment change applied to today and the rest of this week.",
  program: "Program settings applied to today and the rest of this week.",
  reset: "Week reset to the auto-generated plan.",
};

const TRAINING_WEEK_REFRESH_TOAST_ID = "training-week-refresh";

type TrainingWeekRefreshState = {
  /** Bumped after persisted week regenerates so plan hooks refetch. */
  planRevision: number;
  notifyRefreshed: (reason: TrainingWeekRefreshReason) => void;
  bumpPlanRevision: () => void;
};

export const useTrainingWeekRefreshStore = create<TrainingWeekRefreshState>(
  (set) => ({
    planRevision: 0,

    notifyRefreshed: (reason) =>
      set((s) => {
        toast.info(TOAST_MESSAGE[reason], {
          id: TRAINING_WEEK_REFRESH_TOAST_ID,
          duration: 5000,
        });
        return { planRevision: s.planRevision + 1 };
      }),

    bumpPlanRevision: () =>
      set((s) => ({
        planRevision: s.planRevision + 1,
      })),
  }),
);
