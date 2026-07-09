import {
  GUEST_COOKIE_MAX_AGE_SECONDS,
  GUEST_COOKIE_NAME,
} from "@/lib/auth/constants";

function secureSuffix(): string {
  return typeof window !== "undefined" && window.location.protocol === "https:"
    ? "; secure"
    : "";
}

/** Set guest mode cookie from the client (bundled Capacitor - no `/api/auth/guest`). */
export function setGuestCookieActive(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${GUEST_COOKIE_NAME}=1; path=/; max-age=${GUEST_COOKIE_MAX_AGE_SECONDS}; samesite=lax${secureSuffix()}`;
}

/** Clear guest cookie from the client (bundled Capacitor - no `/api/auth/guest` DELETE). */
export function clearGuestCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${GUEST_COOKIE_NAME}=; path=/; max-age=0; samesite=lax${secureSuffix()}`;
}

export function readGuestCookieActive(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .some((c) => c === `${GUEST_COOKIE_NAME}=1`);
}
