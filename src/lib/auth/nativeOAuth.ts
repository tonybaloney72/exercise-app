import { CAPACITOR_APP_ID } from "@/lib/capacitorAppId";
import { APP_HOME, safeReturnTo } from "@/lib/auth/constants";

export const NATIVE_OAUTH_CALLBACK_HOST = "auth";
export const NATIVE_OAUTH_CALLBACK_PATH = "/callback";

/** Supabase `redirectTo` for Capacitor deep-link return. */
export function buildNativeOAuthCallbackUrl(
  returnTo?: string,
  appId: string = CAPACITOR_APP_ID,
): string {
  const url = new URL(
    `${appId}://${NATIVE_OAUTH_CALLBACK_HOST}${NATIVE_OAUTH_CALLBACK_PATH}`,
  );
  const next = safeReturnTo(returnTo);
  if (next !== APP_HOME) {
    url.searchParams.set("next", next);
  }
  return url.toString();
}

export function isNativeOAuthCallbackUrl(
  raw: string,
  appId: string = CAPACITOR_APP_ID,
): boolean {
  try {
    const parsed = parseNativeOAuthCallbackUrl(raw, appId);
    return parsed !== null;
  } catch {
    return false;
  }
}

/** Parse `dev.myexercise.app://auth/callback?code=…&next=…`. */
export function parseNativeOAuthCallbackUrl(
  raw: string,
  appId: string = CAPACITOR_APP_ID,
): { code: string | null; next: string } | null {
  const prefix = `${appId}://`;
  if (!raw.startsWith(prefix)) return null;

  const asHttp = `https://${raw.slice(prefix.length)}`;
  let url: URL;
  try {
    url = new URL(asHttp);
  } catch {
    return null;
  }

  if (
    url.hostname !== NATIVE_OAUTH_CALLBACK_HOST ||
    url.pathname !== NATIVE_OAUTH_CALLBACK_PATH
  ) {
    return null;
  }

  return {
    code: url.searchParams.get("code"),
    next: safeReturnTo(url.searchParams.get("next")),
  };
}
