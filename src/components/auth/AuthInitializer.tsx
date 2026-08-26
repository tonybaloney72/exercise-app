"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import type { AuthUser } from "@/core";
import { readGuestCookieActive } from "@/lib/auth/guestCookieClient";
import { migrateLocalDataIfNeeded } from "@/lib/auth/migration";
import { clientTrace } from "@/lib/diagnostics/clientTrace";
import { settingsTraceUserPrefix } from "@/lib/diagnostics/settingsLoadTrace";

function readGuestCookie(): boolean {
  return readGuestCookieActive();
}

interface Props {
  initialUser: AuthUser | null;
  initialGuest: boolean;
  /** Capacitor static export: hydrate auth from Supabase + cookies on mount. */
  clientBootstrap?: boolean;
}

/**
 * Mounted inside the (app) layout. Pushes the server-resolved auth state
 * into the Zustand store on first paint, runs the first-login migration
 * if applicable, and keeps the store in sync with Supabase's auth state
 * changes for the lifetime of the session.
 */
export default function AuthInitializer({ initialUser, initialGuest, clientBootstrap }: Props) {
  useEffect(() => {
    const { setUser, setGuest } = useAuthStore.getState();

    async function applyBootstrap() {
      if (clientBootstrap) {
        const guest = readGuestCookie();
        setGuest(guest);
        clientTrace("settings", "auth_bootstrap_guest", {
          clientBootstrap: true,
          guest,
        });
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const u = session?.user;
        setUser(u ? { id: u.id, email: u.email ?? null } : null);
        clientTrace(
          "settings",
          u ? "auth_bootstrap_session_user" : "auth_bootstrap_session_null",
          {
            clientBootstrap: true,
            userIdPrefix: settingsTraceUserPrefix(u?.id),
            hasSession: Boolean(session),
          },
          u ? "info" : "warn",
        );
        if (u) {
          void migrateLocalDataIfNeeded(u.id);
        }
        return;
      }

      setGuest(initialGuest);
      setUser(initialUser);
      clientTrace("settings", "auth_bootstrap_server", {
        clientBootstrap: false,
        guest: initialGuest,
        userIdPrefix: settingsTraceUserPrefix(initialUser?.id),
      });

      if (initialUser) {
        void migrateLocalDataIfNeeded(initialUser.id);
      }
    }

    void applyBootstrap();

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
  }, [initialUser, initialGuest, clientBootstrap]);

  return null;
}
