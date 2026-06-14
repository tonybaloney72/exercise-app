export type AppVersionPayload = {
  buildId: string;
  version: string;
  forceUpdate: boolean;
  message: string;
};

const DISMISS_KEY_PREFIX = "app-version-dismissed:";

/** Build id baked into the client bundle at compile time. */
export function getClientBuildId(): string {
  return process.env.NEXT_PUBLIC_BUILD_ID ?? "development";
}

/** Package version baked into the client bundle at compile time. */
export function getClientAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
}

/** Resolve the running deployment's build id on the server. */
export function resolveServerBuildId(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_BUILD_ID ??
    (process.env.NODE_ENV === "production" ? "unknown" : "development")
  );
}

export function resolveServerAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
}

export function defaultUpdateMessage(): string {
  return "A new version of MyExercise is available.";
}

export function resolveUpdateMessage(): string {
  const custom = process.env.APP_UPDATE_MESSAGE?.trim();
  return custom && custom.length > 0 ? custom : defaultUpdateMessage();
}

export function isForceUpdateEnabled(): boolean {
  return process.env.APP_FORCE_UPDATE === "true";
}

export function buildAppVersionPayload(): AppVersionPayload {
  return {
    buildId: resolveServerBuildId(),
    version: resolveServerAppVersion(),
    forceUpdate: isForceUpdateEnabled(),
    message: resolveUpdateMessage(),
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

export function dismissStorageKey(serverBuildId: string): string {
  return `${DISMISS_KEY_PREFIX}${serverBuildId}`;
}

export function readDismissedBuildId(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(DISMISS_KEY_PREFIX)) {
        return key.slice(DISMISS_KEY_PREFIX.length);
      }
    }
  } catch {
    return null;
  }
  return null;
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
  window.location.reload();
}
