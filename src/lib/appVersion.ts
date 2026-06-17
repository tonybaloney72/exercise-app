import { resolveAndroidAppDownloadAbsoluteUrl } from "@/lib/androidAppDownload";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import packageJson from "../../package.json";

export type AppVersionPayload = {
  buildId: string;
  version: string;
  forceUpdate: boolean;
  message: string;
  /** Absolute URL for the latest Android APK (native update channel). */
  apkDownloadUrl: string;
  /** Expected installed APK version (matches Android `versionName`). */
  apkBuildId: string;
};

const DISMISS_KEY_PREFIX = "app-version-dismissed:";

/** Build id baked into the client bundle at compile time. */
export function getClientBuildId(): string {
  return process.env.NEXT_PUBLIC_BUILD_ID ?? "development";
}

/** Resolve the running deployment's build id on the server. */
function resolveServerBuildId(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_BUILD_ID ??
    (process.env.NODE_ENV === "production" ? "unknown" : "development")
  );
}

function resolveServerAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
}

function defaultUpdateMessage(): string {
  return "A new version of MyExercise is available.";
}

function resolveUpdateMessage(): string {
  const custom = process.env.APP_UPDATE_MESSAGE?.trim();
  return custom && custom.length > 0 ? custom : defaultUpdateMessage();
}

function isForceUpdateEnabled(): boolean {
  return process.env.APP_FORCE_UPDATE === "true";
}

function resolveServerApkBuildId(): string {
  const configured = process.env.NATIVE_APK_BUILD?.trim();
  return configured && configured.length > 0 ? configured : packageJson.version;
}

export function buildAppVersionPayload(): AppVersionPayload {
  return {
    buildId: resolveServerBuildId(),
    version: resolveServerAppVersion(),
    forceUpdate: isForceUpdateEnabled(),
    message: resolveUpdateMessage(),
    apkDownloadUrl: resolveAndroidAppDownloadAbsoluteUrl(),
    apkBuildId: resolveServerApkBuildId(),
  };
}

export function shouldPromptSoftUpdate(
  clientBuildId: string,
  serverBuildId: string,
): boolean {
  return clientBuildId !== serverBuildId;
}

export function shouldForceUpdate(
  clientBuildId: string,
  serverBuildId: string,
  forceUpdate: boolean,
): boolean {
  return forceUpdate && shouldPromptSoftUpdate(clientBuildId, serverBuildId);
}

function dismissStorageKey(serverBuildId: string): string {
  return `${DISMISS_KEY_PREFIX}${serverBuildId}`;
}

export function isSoftUpdateDismissed(serverBuildId: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(dismissStorageKey(serverBuildId)) === "1";
  } catch {
    return false;
  }
}

export function dismissSoftUpdate(serverBuildId: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(DISMISS_KEY_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
    sessionStorage.setItem(dismissStorageKey(serverBuildId), "1");
  } catch {
    // Ignore private browsing / quota errors.
  }
}

export function hardRefreshApp(): void {
  if (isNativePlatform()) {
    const url = new URL(window.location.href);
    url.searchParams.set("_refresh", String(Date.now()));
    window.location.replace(`${url.pathname}${url.search}${url.hash}`);
    return;
  }
  window.location.reload();
}
