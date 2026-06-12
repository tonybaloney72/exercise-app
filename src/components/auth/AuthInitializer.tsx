"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore, type AuthUser } from "@/stores/useAuthStore";
import { GUEST_COOKIE_NAME } from "@/lib/auth/constants";
import { migrateLocalDataIfNeeded } from "@/lib/auth/migration";

function readGuestCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .some((c) => c === `${GUEST_COOKIE_NAME}=1`);
}

interface Props {
  initialUser: AuthUser | null;
  initialGuest: boolean;
}

/**
 * Mounted inside the (app) layout. Pushes the server-resolved auth state
 * into the Zustand store on first paint, runs the first-login migration
 * if applicable, and keeps the store in sync with Supabase's auth state
 * changes for the lifetime of the session.
 */
export default function AuthInitializer({ initialUser, initialGuest }: Props) {
  useEffect(() => {
    const { setUser, setGuest } = useAuthStore.getState();
    setGuest(initialGuest);
    setUser(initialUser);

    if (initialUser) {
      void migrateLocalDataIfNeeded(initialUser.id);
    }

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
      // Re-read the cookie in case it changed (e.g. exit guest in another tab).
      setGuest(readGuestCookie());

      // Fresh login on this device - migrate any local data.
      if (event === "SIGNED_IN" && u) {
        void migrateLocalDataIfNeeded(u.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [initialUser, initialGuest]);

  return null;
}
