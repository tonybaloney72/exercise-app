"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import {
  type AppVersionPayload,
  dismissSoftUpdate,
  getClientBuildId,
  hardRefreshApp,
  isSoftUpdateDismissed,
  shouldForceUpdate,
  shouldPromptSoftUpdate,
} from "@/lib/appVersion";
import { resolveApiUrl } from "@/lib/apiBaseUrl";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

async function fetchAppVersion(): Promise<AppVersionPayload | null> {
  try {
    const res = await fetch(resolveApiUrl("/api/version"), { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as AppVersionPayload;
  } catch {
    return null;
  }
}

export default function AppVersionSync() {
  const clientBuildId = getClientBuildId();
  const [forceOpen, setForceOpen] = useState(false);
  const [softOpen, setSoftOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [serverBuildId, setServerBuildId] = useState<string | null>(null);
  const checkingRef = useRef(false);

  const applyVersionPayload = useCallback(
    (payload: AppVersionPayload) => {
      setServerBuildId(payload.buildId);
      setMessage(payload.message);

      if (!shouldPromptSoftUpdate(clientBuildId, payload.buildId)) {
        setForceOpen(false);
        setSoftOpen(false);
        return;
      }

      if (
        shouldForceUpdate(
          clientBuildId,
          payload.buildId,
          payload.forceUpdate,
        )
      ) {
        setSoftOpen(false);
        setForceOpen(true);
        return;
      }

      setForceOpen(false);
      setSoftOpen(!isSoftUpdateDismissed(payload.buildId));
    },
    [clientBuildId],
  );

  const checkForUpdate = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const payload = await fetchAppVersion();
      if (payload) applyVersionPayload(payload);
    } finally {
      checkingRef.current = false;
    }
  }, [applyVersionPayload]);

  useEffect(() => {
    void checkForUpdate();

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void checkForUpdate();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onVisibilityChange);

    const intervalId = window.setInterval(() => {
      void checkForUpdate();
    }, CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [checkForUpdate]);

  function handleDismissSoft() {
    if (serverBuildId) dismissSoftUpdate(serverBuildId);
    setSoftOpen(false);
  }

  return (
    <>
      {softOpen && !forceOpen ? (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-55 border-b border-accent/30 bg-accent px-4 py-3 text-white shadow-lg shadow-accent/20"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <p className="min-w-0 text-sm font-medium leading-snug">{message}</p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleDismissSoft}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-white/85 transition-colors hover:bg-white/15"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={hardRefreshApp}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-accent transition-colors hover:bg-white/90"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BottomSheetModal
        open={forceOpen}
        onClose={hardRefreshApp}
        title="Update required"
        hint={message}
        placement="center"
        showCloseButton={false}
        closeOnBackdropClick={false}
        closeOnEscape={false}
        footer={
          <button
            type="button"
            onClick={hardRefreshApp}
            className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          >
            Refresh to update
          </button>
        }
      >
        <p className="px-4 py-3 text-sm text-muted">
          This version is no longer supported. Refresh to load the latest
          MyExercise release and continue.
        </p>
      </BottomSheetModal>
    </>
  );
}
