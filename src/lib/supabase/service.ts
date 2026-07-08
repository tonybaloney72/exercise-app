import { createClient } from "@supabase/supabase-js";
import { FatSecretConfigError } from "@/lib/fatsecret/errors";

/**
 * Supabase service role client for server-only tables (e.g. nutrition tokens).
 * Never import this from client components.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new FatSecretConfigError(
      "Supabase service role is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
