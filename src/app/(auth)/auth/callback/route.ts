import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_HOME, safeReturnTo } from "@/lib/auth/constants";

/**
 * OAuth / magic-link / recovery callback. Exchanges the `code` for a
 * session and redirects to `next` (allowlisted) or APP_HOME.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` is used by the forgot-password flow to route to /auth/update-password.
  const next = safeReturnTo(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Invalid or expired link.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // For the recovery flow, `next` points at /auth/update-password and we
  // honor it as-is (it's in the public-neutral list). Otherwise APP_HOME.
  const target = searchParams.get("next") === "/auth/update-password"
    ? "/auth/update-password"
    : next;

  return NextResponse.redirect(`${origin}${target || APP_HOME}`);
}
