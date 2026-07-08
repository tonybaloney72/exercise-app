import { createHmac, randomBytes } from "node:crypto";
import { getFatSecretConsumerCredentials } from "@/lib/fatsecret/config";
import { FatSecretApiError } from "@/lib/fatsecret/errors";

const FATSECRET_REST_URL =
  "https://platform.fatsecret.com/rest/server.api" as const;

type FatSecretUserOAuth = {
  token: string;
  secret: string;
};

type SignedRequestOptions = {
  method: string;
  params?: Record<string, string | number | boolean | undefined>;
  userOAuth?: FatSecretUserOAuth;
};

/** RFC 3986 percent-encoding for OAuth 1.0 parameter encoding. */
export function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function normalizeOAuthParams(
  params: Record<string, string>,
): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key]!)}`)
    .join("&");
}

export function buildOAuthSignatureBaseString(args: {
  httpMethod: string;
  requestUrl: string;
  params: Record<string, string>;
}): string {
  return [
    percentEncode(args.httpMethod.toUpperCase()),
    percentEncode(args.requestUrl),
    percentEncode(normalizeOAuthParams(args.params)),
  ].join("&");
}

export function signOAuthBaseString(
  baseString: string,
  consumerSecret: string,
  tokenSecret = "",
): string {
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return createHmac("sha1", signingKey).update(baseString).digest("base64");
}

function buildOAuthFormBody(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join("&");
}

function createOAuthNonce(): string {
  return randomBytes(16).toString("hex");
}

function stringifyParams(
  params: Record<string, string | number | boolean | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    out[key] = String(value);
  }
  return out;
}

function parseFatSecretError(payload: unknown): FatSecretApiError | null {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as { error?: unknown }).error;
  if (!error || typeof error !== "object") return null;
  const codeRaw = (error as { code?: unknown }).code;
  const messageRaw = (error as { message?: unknown }).message;
  const code =
    typeof codeRaw === "number"
      ? codeRaw
      : typeof codeRaw === "string"
        ? Number.parseInt(codeRaw, 10)
        : undefined;
  const message =
    typeof messageRaw === "string" ? messageRaw : "FatSecret API request failed.";
  return new FatSecretApiError(message, Number.isFinite(code) ? code : undefined);
}

/**
 * Signed FatSecret REST call (OAuth 1.0). Use without `userOAuth` for global
 * food data; pass profile tokens for diary/profile methods (Step 2+).
 */
export async function fatsecretSignedRequest<T = unknown>(
  options: SignedRequestOptions,
): Promise<T> {
  const { consumerKey, consumerSecret } = getFatSecretConsumerCredentials();
  const apiParams = stringifyParams({
    method: options.method,
    format: "json",
    ...options.params,
  });

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: createOAuthNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0",
  };

  if (options.userOAuth) {
    oauthParams.oauth_token = options.userOAuth.token;
  }

  const signatureParams = { ...apiParams, ...oauthParams };
  const baseString = buildOAuthSignatureBaseString({
    httpMethod: "POST",
    requestUrl: FATSECRET_REST_URL,
    params: signatureParams,
  });
  oauthParams.oauth_signature = signOAuthBaseString(
    baseString,
    consumerSecret,
    options.userOAuth?.secret ?? "",
  );

  const body = buildOAuthFormBody({ ...apiParams, ...oauthParams });

  const response = await fetch(FATSECRET_REST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw new FatSecretApiError(
      "FatSecret returned a non-JSON response.",
      response.status,
      text.slice(0, 240),
    );
  }

  const apiError = parseFatSecretError(payload);
  if (apiError) throw apiError;

  if (!response.ok) {
    throw new FatSecretApiError(
      "FatSecret API request failed.",
      response.status,
      typeof text === "string" ? text.slice(0, 240) : undefined,
    );
  }

  return payload as T;
}
