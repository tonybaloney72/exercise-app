export const GUEST_COOKIE_NAME = "exercise_app_guest";
export const GUEST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const APP_HOME = "/today";
export const LANDING_PATH = "/";

/**
 * Paths a signed-in Supabase user should be redirected away from
 * (back to APP_HOME). Landing is handled separately.
 */
const AUTH_ONLY_PATHS = ["/login", "/signup", "/forgot-password"] as const;

/**
 * Paths that are always public regardless of session state.
 * `/auth/callback` (code exchange) and `/auth/update-password`
 * (recovery flow) must remain reachable even with an active session.
 */
const PUBLIC_NEUTRAL_PATHS = [
  "/auth/callback",
  "/auth/update-password",
  "/privacy",
  "/terms",
] as const;

export function isAuthOnlyPath(pathname: string): boolean {
  return (AUTH_ONLY_PATHS as readonly string[]).includes(pathname);
}

function isPublicNeutralPath(pathname: string): boolean {
  return PUBLIC_NEUTRAL_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function isPublicPath(pathname: string): boolean {
  return (
    pathname === LANDING_PATH ||
    isAuthOnlyPath(pathname) ||
    isPublicNeutralPath(pathname)
  );
}

/**
 * Allowlist a `returnTo` query param so we never redirect to an
 * external origin or to an auth-only path. Returns APP_HOME on miss.
 */
export function safeReturnTo(returnTo: string | null | undefined): string {
  if (!returnTo) return APP_HOME;
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return APP_HOME;
  if (isAuthOnlyPath(returnTo) || returnTo === LANDING_PATH) return APP_HOME;
  if (isPublicNeutralPath(returnTo)) return APP_HOME;
  return returnTo;
}
