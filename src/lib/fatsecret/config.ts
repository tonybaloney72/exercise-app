import { FatSecretConfigError } from "@/lib/fatsecret/errors";

export type FatSecretConsumerCredentials = {
  consumerKey: string;
  consumerSecret: string;
};

/** OAuth 1.0 consumer key + shared secret (server-only env). */
export function getFatSecretConsumerCredentials(): FatSecretConsumerCredentials {
  const consumerKey = process.env.FATSECRET_OAUTH_ONE_KEY?.trim();
  const consumerSecret = process.env.FATSECRET_OAUTH_ONE_SECRET?.trim();

  if (!consumerKey || !consumerSecret) {
    throw new FatSecretConfigError(
      "FatSecret OAuth 1.0 credentials are not configured (FATSECRET_OAUTH_ONE_KEY / FATSECRET_OAUTH_ONE_SECRET).",
    );
  }

  return { consumerKey, consumerSecret };
}
