"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import { openAndroidApkDownload } from "@/lib/androidAppDownload";
import {
  type AppVersionPayload,
  dismissSoftUpdate,
  getClientBuildId,
  hardRefreshApp,
} from "@/lib/appVersion";
import {
  dismissNativeApkUpdate,
  evaluateVersionPrompt,
  type VersionPromptState,
} from "@/lib/appVersionSyncLogic";
import { resolveApiUrl } from "@/lib/apiBaseUrl";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { getInstalledNativeApkBuildId } from "@/lib/nativeApkVersion";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

const EMPTY_PROMPT: VersionPromptState = {
  showSoft: false,
  showForce: false,
  webUpdate: false,
  nativeApkUpdate: false,
  preferApkDownload: false,
};

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
  const nativeShell = isNativePlatform();
  const [prompt, setPrompt] = useState<VersionPromptState>(EMPTY_PROMPT);
  const [message, setMessage] = useState("");
  const [serverBuildId, setServerBuildId] = useState<string | null>(null);
  const [serverApkBuildId, setServerApkBuildId] = useState<string | null>(null);
  const [apkDownloadUrl, setApkDownloadUrl] = useState<string | null>(null);
  const [installedNativeApkBuildId, setInstalledNativeApkBuildId] = useState<
    string | null
  >(null);
  const checkingRef = useRef(false);

  const refreshInstalledNativeBuild = useCallback(async () => {
    if (!nativeShell) return;
    const installed = await getInstalledNativeApkBuildId();
    setInstalledNativeApkBuildId(installed);
    return installed;
  }, [nativeShell]);

  const applyVersionPayload = useCallback(
    (
      payload: AppVersionPayload,
      installedApkBuildId: string | null = installedNativeApkBuildId,
    ) => {
      setServerBuildId(payload.buildId);
      setServerApkBuildId(payload.apkBuildId);
      setMessage(payload.message);
      setApkDownloadUrl(payload.apkDownloadUrl);

      setPrompt(
        evaluateVersionPrompt({
          clientWebBuildId: clientBuildId,
          installedNativeApkBuildId: installedApkBuildId,
          payload,
          isNativeShell: nativeShell,
        }),
      );
    },
    [clientBuildId, installedNativeApkBuildId, nativeShell],
  );

  const checkForUpdate = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const [payload, installedApkBuildId] = await Promise.all([
        fetchAppVersion(),
        nativeShell ? refreshInstalledNativeBuild() : Promise.resolve(null),
      ]);
      if (payload) {
        applyVersionPayload(payload, installedApkBuildId ?? null);
      }
    } finally {
      checkingRef.current = false;
    }
  }, [applyVersionPayload, nativeShell, refreshInstalledNativeBuild]);

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

    let appStateListener: { remove: () => Promise<void> } | undefined;
    if (nativeShell) {
      void import("@capacitor/app").then(({ App }) => {
        void App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) void checkForUpdate();
        }).then((listener) => {
          appStateListener = listener;
        });
      });
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
      window.clearInterval(intervalId);
      void appStateListener?.remove();
    };
  }, [checkForUpdate, nativeShell]);

  function handleDismissSoft() {
    if (prompt.nativeApkUpdate && serverApkBuildId) {
      dismissNativeApkUpdate(serverApkBuildId);
    }
    if (prompt.webUpdate && serverBuildId) {
      dismissSoftUpdate(serverBuildId);
    }
    setPrompt(EMPTY_PROMPT);
  }

  function handleDownloadApk() {
    if (!apkDownloadUrl) return;
    void openAndroidApkDownload(apkDownloadUrl);
  }

  const bannerMessage = prompt.nativeApkUpdate
    ? prompt.webUpdate
      ? `${message} Reload for web updates or download the latest APK.`
      : `A new Android app version (${serverApkBuildId}) is available. Download and install the latest APK.`
    : message;

  return (
    <>
      {prompt.showSoft && !prompt.showForce ? (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-[100] border-b border-accent/30 bg-accent px-4 py-3 text-white shadow-lg shadow-accent/20"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="mx-auto flex max-w-lg flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-sm font-medium leading-snug">
              {bannerMessage}
            </p>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {prompt.preferApkDownload ? (
                <button
                  type="button"
                  onClick={handleDownloadApk}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-accent transition-colors hover:bg-white/90"
                >
                  Download APK
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleDismissSoft}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-white/85 transition-colors hover:bg-white/15"
              >
                Dismiss
              </button>
              {prompt.webUpdate ? (
                <button
                  type="button"
                  onClick={hardRefreshApp}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    prompt.preferApkDownload
                      ? "border border-white/40 text-white hover:bg-white/15"
                      : "bg-white text-accent hover:bg-white/90"
                  }`}
                >
                  {prompt.preferApkDownload ? "Reload" : "Refresh"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <BottomSheetModal
        open={prompt.showForce}
        onClose={prompt.preferApkDownload ? handleDownloadApk : hardRefreshApp}
        title="Update required"
        hint={
          prompt.preferApkDownload
            ? "Download and install the latest APK to continue."
            : message
        }
        placement="center"
        showCloseButton={false}
        closeOnBackdropClick={false}
        closeOnEscape={false}
        footer={
          prompt.preferApkDownload ? (
            <div className="flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={handleDownloadApk}
                className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
              >
                Download latest APK
              </button>
              {prompt.webUpdate ? (
                <button
                  type="button"
                  onClick={hardRefreshApp}
                  className="w-full rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
                >
                  Reload app
                </button>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={hardRefreshApp}
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
            >
              Refresh to update
            </button>
          )
        }
      >
        <p className="px-4 py-3 text-sm text-muted">
          {prompt.preferApkDownload
            ? prompt.webUpdate
              ? "This release needs a newer APK and updated web content. Download the APK, install it, then reopen MyExercise."
              : "This Android install is out of date. Download the APK, install it, then reopen MyExercise."
            : "This version is no longer supported. Refresh to load the latest MyExercise release and continue."}
        </p>
      </BottomSheetModal>
    </>
  );
}
