import { createClient } from "@/lib/supabase/client";
import { humanizeAuthError } from "@/lib/auth/humanizeAuthError";
import { parseNativeOAuthCallbackUrl } from "@/lib/auth/nativeOAuth";

export type NativeOAuthCompletion =
  | { ok: true; next: string }
  | { ok: false; error: string };

/** Exchange PKCE code in the WebView after the deep link returns. */
export async function completeNativeOAuthFromUrl(
  rawUrl: string,
): Promise<NativeOAuthCompletion> {
  const parsed = parseNativeOAuthCallbackUrl(rawUrl);
  if (!parsed) {
    return { ok: false, error: "Unrecognized sign-in redirect." };
  }

  if (!parsed.code) {
    return { ok: false, error: "Invalid or expired sign-in link." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(parsed.code);

  if (error) {
    return {
      ok: false,
      error: humanizeAuthError(error.message, "login"),
    };
  }

  return { ok: true, next: parsed.next };
}
