"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { completeNativeOAuthFromUrl } from "@/lib/auth/completeNativeOAuth";
import { isNativeOAuthCallbackUrl } from "@/lib/auth/nativeOAuth";
import { isNativePlatform } from "@/lib/capacitorRuntime";

/**
 * Finishes Google OAuth in the Capacitor shell: deep link → exchange code in
 * the WebView (PKCE verifier stays in-app) → navigate.
 */
export default function NativeOAuthSync() {
  const router = useRouter();
  const handlingRef = useRef(false);

  useEffect(() => {
    if (!isNativePlatform()) return;

    async function handleUrl(rawUrl: string) {
      if (!isNativeOAuthCallbackUrl(rawUrl) || handlingRef.current) return;

      handlingRef.current = true;
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.close().catch(() => {});

        const result = await completeNativeOAuthFromUrl(rawUrl);
        if (!result.ok) {
          router.replace(
            `/login?error=${encodeURIComponent(result.error)}`,
          );
          return;
        }

        router.refresh();
        router.replace(result.next);
      } finally {
        handlingRef.current = false;
      }
    }

    let removed = false;
    let listener: { remove: () => Promise<void> } | undefined;

    void (async () => {
      const { App } = await import("@capacitor/app");

      const launch = await App.getLaunchUrl();
      if (!removed && launch?.url) {
        await handleUrl(launch.url);
      }

      listener = await App.addListener("appUrlOpen", (event) => {
        void handleUrl(event.url);
      });
    })();

    return () => {
      removed = true;
      void listener?.remove();
    };
  }, [router]);

  return null;
}
