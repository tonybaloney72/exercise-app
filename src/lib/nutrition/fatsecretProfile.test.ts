import { describe, expect, it } from "vitest";
import { parseProfileAuthResponse } from "@/lib/fatsecret/profile";
import {
  decryptFatSecretProfileSecret,
  encryptFatSecretProfileSecret,
  generateFatSecretProfileEncryptionKey,
} from "@/lib/nutrition/fatsecretProfileCrypto";

describe("parseProfileAuthResponse", () => {
  it("extracts auth token and secret", () => {
    const auth = parseProfileAuthResponse({
      profile: {
        auth_token: "token-1",
        auth_secret: "secret-1",
      },
    });
    expect(auth).toEqual({ token: "token-1", secret: "secret-1" });
  });
});

describe("fatsecretProfileCrypto", () => {
  it("round-trips encrypted secrets", () => {
    const previous = process.env.FATSECRET_PROFILE_ENCRYPTION_KEY;
    process.env.FATSECRET_PROFILE_ENCRYPTION_KEY =
      generateFatSecretProfileEncryptionKey();

    try {
      const encrypted = encryptFatSecretProfileSecret("cadff7ef247744b4bff48fb2489451fc");
      expect(decryptFatSecretProfileSecret(encrypted)).toBe(
        "cadff7ef247744b4bff48fb2489451fc",
      );
    } finally {
      if (previous === undefined) {
        delete process.env.FATSECRET_PROFILE_ENCRYPTION_KEY;
      } else {
        process.env.FATSECRET_PROFILE_ENCRYPTION_KEY = previous;
      }
    }
  });
});
