import { create } from "zustand";

type WorkoutSubnavState = {
  hideSiblingTabs: boolean;
  setHideSiblingTabs: (hide: boolean) => void;
};

export const useWorkoutSubnavStore = create<WorkoutSubnavState>((set) => ({
  hideSiblingTabs: false,
  setHideSiblingTabs: (hideSiblingTabs) => set({ hideSiblingTabs }),
}));
