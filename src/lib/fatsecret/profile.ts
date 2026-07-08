import { fatsecretSignedRequest } from "@/lib/fatsecret/oauth1";
import { FatSecretApiError } from "@/lib/fatsecret/errors";

export type FatSecretProfileAuth = {
  token: string;
  secret: string;
};

type RawProfileResponse = {
  profile?: {
    auth_token?: string;
    auth_secret?: string;
  };
};

export function parseProfileAuthResponse(
  payload: RawProfileResponse,
): FatSecretProfileAuth | null {
  const token = payload.profile?.auth_token?.trim();
  const secret = payload.profile?.auth_secret?.trim();
  if (!token || !secret) return null;
  return { token, secret };
}

export async function fatsecretCreateProfile(
  userId: string,
): Promise<FatSecretProfileAuth> {
  const payload = await fatsecretSignedRequest<RawProfileResponse>({
    method: "profile.create",
    params: { user_id: userId },
  });

  const auth = parseProfileAuthResponse(payload);
  if (!auth) {
    throw new FatSecretApiError("FatSecret profile.create returned no auth tokens.");
  }

  return auth;
}

/** Recover tokens for an existing FatSecret profile id (our Supabase user id). */
export async function fatsecretGetProfileAuth(
  userId: string,
): Promise<FatSecretProfileAuth> {
  const payload = await fatsecretSignedRequest<RawProfileResponse>({
    method: "profile.get_auth",
    params: { user_id: userId },
  });

  const auth = parseProfileAuthResponse(payload);
  if (!auth) {
    throw new FatSecretApiError(
      "FatSecret profile.get_auth returned no auth tokens.",
    );
  }

  return auth;
}
