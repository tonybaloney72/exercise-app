import type { FatSecretProfileAuth } from "@/lib/fatsecret/profile";
import {
  ensureNutritionFatSecretProfile,
  getFatSecretUserOAuth,
} from "@/lib/nutrition/fatsecretProfileRepo";

export async function requireUserFatSecretOAuth(
  userId: string,
): Promise<FatSecretProfileAuth> {
  await ensureNutritionFatSecretProfile(userId);
  const oauth = await getFatSecretUserOAuth(userId);
  if (!oauth) {
    throw new Error("FatSecret profile is not available for this user.");
  }
  return oauth;
}
