import type { AppVersionPayload } from "@/lib/appVersion";
import {
  isSoftUpdateDismissed,
  shouldForceUpdate,
  shouldPromptSoftUpdate,
} from "@/lib/appVersion";

const NATIVE_APK_DISMISS_PREFIX = "app-version-dismissed-native:";

function nativeApkDismissStorageKey(apkBuildId: string): string {
  return `${NATIVE_APK_DISMISS_PREFIX}${apkBuildId}`;
}

export function isNativeApkUpdateDismissed(apkBuildId: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return (
      sessionStorage.getItem(nativeApkDismissStorageKey(apkBuildId)) === "1"
    );
  } catch {
    return false;
  }
}

export function dismissNativeApkUpdate(apkBuildId: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(NATIVE_APK_DISMISS_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
    sessionStorage.setItem(nativeApkDismissStorageKey(apkBuildId), "1");
  } catch {
    // Ignore private browsing / quota errors.
  }
}

export function needsWebBuildUpdate(
  clientWebBuildId: string,
  serverWebBuildId: string,
): boolean {
  return shouldPromptSoftUpdate(clientWebBuildId, serverWebBuildId);
}

export function needsNativeApkUpdate(
  installedNativeApkBuildId: string | null,
  serverApkBuildId: string,
): boolean {
  if (!installedNativeApkBuildId) return false;
  return installedNativeApkBuildId !== serverApkBuildId;
}

export type VersionPromptState = {
  showSoft: boolean;
  showForce: boolean;
  webUpdate: boolean;
  nativeApkUpdate: boolean;
  preferApkDownload: boolean;
};

export function evaluateVersionPrompt(options: {
  clientWebBuildId: string;
  installedNativeApkBuildId: string | null;
  payload: AppVersionPayload;
  isNativeShell: boolean;
}): VersionPromptState {
  const { clientWebBuildId, installedNativeApkBuildId, payload, isNativeShell } =
    options;

  const webUpdate = needsWebBuildUpdate(clientWebBuildId, payload.buildId);
  const nativeApkUpdate = needsNativeApkUpdate(
    installedNativeApkBuildId,
    payload.apkBuildId,
  );
  const needsUpdate = webUpdate || nativeApkUpdate;

  if (!needsUpdate) {
    return {
      showSoft: false,
      showForce: false,
      webUpdate: false,
      nativeApkUpdate: false,
      preferApkDownload: false,
    };
  }

  const forceWeb = shouldForceUpdate(
    clientWebBuildId,
    payload.buildId,
    payload.forceUpdate,
  );
  const forceNative =
    payload.forceUpdate && nativeApkUpdate && isNativeShell;
  const showForce = forceWeb || forceNative;

  const webDismissed = isSoftUpdateDismissed(payload.buildId);
  const nativeDismissed = isNativeApkUpdateDismissed(payload.apkBuildId);
  const dismissed =
    nativeApkUpdate && !webUpdate
      ? nativeDismissed
      : webUpdate && !nativeApkUpdate
        ? webDismissed
        : webDismissed && nativeDismissed;

  return {
    showSoft: !showForce && !dismissed,
    showForce,
    webUpdate,
    nativeApkUpdate,
    preferApkDownload: isNativeShell && (nativeApkUpdate || webUpdate),
  };
}
