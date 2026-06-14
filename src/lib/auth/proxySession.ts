import type { NextRequest } from "next/server";
import { isPublicPath, LANDING_PATH } from "@/lib/auth/constants";

/** Client-side RSC flight or router prefetch (tab switch), not a full document load. */
export function isSoftNavigationRequest(request: NextRequest): boolean {
  return (
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1"
  );
}

/** Authenticated app shell routes (past landing/auth). */
export function isAppShellPath(pathname: string): boolean {
  return pathname !== LANDING_PATH && !isPublicPath(pathname);
}

/** Use cookie session read on soft in-app navigation; full `getUser()` on document loads. */
export function shouldUseSessionOnlyAuth(
  request: NextRequest,
  pathname: string,
): boolean {
  return isSoftNavigationRequest(request) && isAppShellPath(pathname);
}
