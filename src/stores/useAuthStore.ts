"use client";

import { create } from "zustand";

export type AuthMode = "loading" | "authenticated" | "guest" | "anonymous";

export interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthState {
  mode: AuthMode;
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  setGuest: (isGuest: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  mode: "loading",
  user: null,

  setUser: (user) =>
    set((s) => {
      if (user) return { user, mode: "authenticated" as const };
      // Clearing the user: fall back to guest mode if the flag is still set.
      const wasGuest = s.mode === "guest";
      return { user: null, mode: wasGuest ? ("guest" as const) : ("anonymous" as const) };
    }),

  setGuest: (isGuest) => {
    const { user } = get();
    if (user) {
      // Signed-in users override guest mode.
      set({ mode: "authenticated" });
      return;
    }
    set({ mode: isGuest ? "guest" : "anonymous" });
  },

  reset: () => set({ mode: "anonymous", user: null }),
}));
