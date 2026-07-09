import {
  fatsecretCreateProfile,
  fatsecretGetProfileAuth,
  type FatSecretProfileAuth,
} from "@/lib/fatsecret/profile";
import { FatSecretApiError } from "@/lib/fatsecret/errors";
import {
  decryptFatSecretProfileSecret,
  encryptFatSecretProfileSecret,
} from "@/lib/nutrition/fatsecretProfileCrypto";
import { createServiceClient } from "@/lib/supabase/service";

type NutritionFatSecretProfileRow = {
  user_id: string;
  auth_token: string;
  auth_secret_encrypted: string;
  created_at: string;
  updated_at: string;
};

export type NutritionFatSecretProfileStatus = {
  hasProfile: boolean;
  createdAt: string | null;
};

const TABLE = "nutrition_fatsecret_profiles";

async function loadProfileRow(
  userId: string,
): Promise<NutritionFatSecretProfileRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "user_id, auth_token, auth_secret_encrypted, created_at, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load FatSecret profile row: ${error.message}`);
  }

  return data;
}

async function saveProfileRow(
  userId: string,
  auth: FatSecretProfileAuth,
): Promise<NutritionFatSecretProfileRow> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const row = {
    user_id: userId,
    auth_token: auth.token,
    auth_secret_encrypted: encryptFatSecretProfileSecret(auth.secret),
    updated_at: now,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(row, { onConflict: "user_id" })
    .select(
      "user_id, auth_token, auth_secret_encrypted, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new Error(`Failed to save FatSecret profile row: ${error?.message}`);
  }

  return data;
}

async function provisionFatSecretProfile(
  userId: string,
): Promise<FatSecretProfileAuth> {
  try {
    return await fatsecretCreateProfile(userId);
  } catch (error) {
    if (error instanceof FatSecretApiError && error.code === 106) {
      return fatsecretGetProfileAuth(userId);
    }
    throw error;
  }
}

export async function getNutritionFatSecretProfileStatus(
  userId: string,
): Promise<NutritionFatSecretProfileStatus> {
  const row = await loadProfileRow(userId);
  return {
    hasProfile: Boolean(row),
    createdAt: row?.created_at ?? null,
  };
}

/** Create or load the user's FatSecret profile; persists encrypted tokens server-side. */
export async function ensureNutritionFatSecretProfile(
  userId: string,
): Promise<NutritionFatSecretProfileStatus> {
  const existing = await loadProfileRow(userId);
  if (existing) {
    return {
      hasProfile: true,
      createdAt: existing.created_at,
    };
  }

  const auth = await provisionFatSecretProfile(userId);
  const saved = await saveProfileRow(userId, auth);
  return {
    hasProfile: true,
    createdAt: saved.created_at,
  };
}

/** OAuth 1.0 delegated credentials for diary/profile API calls (Step 3+). */

export async function getFatSecretUserOAuth(
  userId: string,
): Promise<FatSecretProfileAuth | null> {
  const row = await loadProfileRow(userId);
  if (!row) return null;

  return {
    token: row.auth_token,
    secret: decryptFatSecretProfileSecret(row.auth_secret_encrypted),
  };
}
