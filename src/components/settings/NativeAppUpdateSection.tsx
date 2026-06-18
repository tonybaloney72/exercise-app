"use client";

import { useCallback, useEffect, useState } from "react";
import CollapsibleSection from "@/components/common/CollapsibleSection";
import { openAndroidApkDownload } from "@/lib/androidAppDownload";
import { type AppVersionPayload } from "@/lib/appVersion";
import { compareSemver } from "@/lib/semverVersionCode";
import { resolveApiUrl } from "@/lib/apiBaseUrl";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { getInstalledNativeApkBuildId } from "@/lib/nativeApkVersion";

function getPublicAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
}

export default function NativeAppUpdateSection() {
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);
  const [remote, setRemote] = useState<AppVersionPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isNativePlatform()) return;
    setError(null);
    try {
      const [installed, res] = await Promise.all([
        getInstalledNativeApkBuildId(),
        fetch(resolveApiUrl("/api/version"), { cache: "no-store" }),
      ]);
      setInstalledVersion(installed);
      if (res.ok) {
        setRemote((await res.json()) as AppVersionPayload);
      }
    } catch {
      setError("Could not check for updates.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    if (!isNativePlatform()) return;

    let listener: { remove: () => Promise<void> } | undefined;
    void import("@capacitor/app").then(({ App }) => {
      void App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void refresh();
      }).then((handle) => {
        listener = handle;
      });
    });

    return () => {
      void listener?.remove();
    };
  }, [refresh]);

  if (!isNativePlatform()) return null;

  const latestApk = remote?.apkBuildId ?? null;
  const updateAvailable =
    installedVersion != null &&
    latestApk != null &&
    compareSemver(installedVersion, latestApk) < 0;

  async function handleDownload() {
    if (!remote?.apkDownloadUrl) return;
    setBusy(true);
    setError(null);
    try {
      await openAndroidApkDownload(remote.apkDownloadUrl);
    } catch {
      setError("Download did not start. Try again or use the link below.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <CollapsibleSection
      title="App update"
      hint={
        updateAvailable
          ? `Update available (${latestApk})`
          : "Native Android install"
      }
      defaultOpen={updateAvailable}
      contentClassName="flex flex-col gap-3 p-4"
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted">Installed</dt>
        <dd className="font-medium text-foreground tabular-nums">
          {installedVersion ?? "…"}
        </dd>
        <dt className="text-muted">Latest APK</dt>
        <dd className="font-medium text-foreground tabular-nums">
          {latestApk ?? "…"}
        </dd>
        <dt className="text-muted">Web release</dt>
        <dd className="font-medium text-foreground tabular-nums">
          {remote?.version ?? getPublicAppVersion()}
        </dd>
      </dl>

      {updateAvailable ? (
        <p className="text-xs leading-snug text-muted">
          A newer APK is available. Download it, install when prompted, then
          reopen MyExercise. Check your notification shade if the download does
          not open automatically.
        </p>
      ) : (
        <p className="text-xs leading-snug text-muted">
          You are on the latest published APK. Web content still updates when
          you reload the app after a site deploy.
        </p>
      )}

      <button
        type="button"
        disabled={busy || !remote?.apkDownloadUrl}
        onClick={() => void handleDownload()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
      >
        {busy ? "Starting download…" : updateAvailable ? "Download update" : "Re-download APK"}
      </button>

      {remote?.apkDownloadUrl ? (
        <p className="text-caption leading-snug text-muted break-all">
          Direct link:{" "}
          <a href={remote.apkDownloadUrl} className="text-accent hover:underline">
            {remote.apkDownloadUrl}
          </a>
        </p>
      ) : null}

      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </CollapsibleSection>
  );
}
