import { NextResponse, type NextRequest } from "next/server";
import { createProxyClient } from "@/lib/supabase/proxy";
import {
  APP_HOME,
  GUEST_COOKIE_NAME,
  isAuthOnlyPath,
  isPublicPath,
  LANDING_PATH,
} from "@/lib/auth/constants";

export async function proxy(request: NextRequest) {
  const { supabase, getResponse } = createProxyClient(request);

  // IMPORTANT: this must run before any logic that branches on the user,
  // so the session cookie is refreshed and re-set onto the response.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isGuest = request.cookies.get(GUEST_COOKIE_NAME)?.value === "1";

  // Signed-in users have no business on the landing or auth-only screens.
  // Recovery routes (/auth/callback, /auth/update-password) are excluded
  // so a logged-in user can still complete a password reset flow.
  if (user && (pathname === LANDING_PATH || isAuthOnlyPath(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = APP_HOME;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // No Supabase session, no guest cookie, and the path is protected.
  if (!user && !isGuest && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  return getResponse();
}

export const config = {
  matcher: [
    /*
     * Run on all routes except:
     * - /api/*           (route handlers manage their own auth)
     * - Next.js internals (_next/static, _next/image, _next/data)
     * - PWA + favicon assets
     * - Any file with an extension (images, fonts, etc.)
     */
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|manifest.json|sw.js|.*\\..*).*)",
  ],
};
