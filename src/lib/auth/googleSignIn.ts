import { createClient } from "@/lib/supabase/client";
import { APP_HOME } from "@/lib/auth/constants";
import { buildNativeOAuthCallbackUrl } from "@/lib/auth/nativeOAuth";
import { isNativePlatform } from "@/lib/capacitorRuntime";

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

export type SignInWithGoogleResult = {
  error: string | null;
  /** Native: OAuth continues in system browser; completion is async via deep link. */
  deferred?: boolean;
};

export async function signInWithGoogle(
  returnTo?: string,
): Promise<SignInWithGoogleResult> {
  if (typeof window === "undefined") {
    return { error: "Google sign-in is only available in the browser." };
  }

  if (isNativePlatform()) {
    return signInWithGoogleNative(returnTo);
  }

  const supabase = createClient();
  const redirectTo = buildOAuthCallbackUrl(window.location.origin, returnTo);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  return { error: error?.message ?? null };
}

async function signInWithGoogleNative(
  returnTo?: string,
): Promise<SignInWithGoogleResult> {
  const supabase = createClient();
  const redirectTo = buildNativeOAuthCallbackUrl(returnTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.url) {
    return { error: "Google sign-in did not return an authorization URL." };
  }

  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: data.url });

  return { error: null, deferred: true };
}
