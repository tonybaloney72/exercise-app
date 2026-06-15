"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isNativePlatform } from "@/lib/capacitorRuntime";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    isNativePlatform()
      ? {
          auth: {
            detectSessionInUrl: false,
          },
        }
      : undefined,
  );
}
