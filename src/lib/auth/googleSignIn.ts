import { createClient } from "@/lib/supabase/client";
import { APP_HOME } from "@/lib/auth/constants";

/** OAuth return URL passed through `/auth/callback` as `next`. */
export function buildOAuthCallbackUrl(
  origin: string,
  returnTo?: string,
): string {
  const url = new URL("/auth/callback", origin);
  if (returnTo && returnTo !== APP_HOME) {
    url.searchParams.set("next", returnTo);
  }
  return url.toString();
}

export async function signInWithGoogle(
  returnTo?: string,
): Promise<{ error: string | null }> {
  if (typeof window === "undefined") {
    return { error: "Google sign-in is only available in the browser." };
  }

  const supabase = createClient();
  const redirectTo = buildOAuthCallbackUrl(window.location.origin, returnTo);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  return { error: error?.message ?? null };
}
