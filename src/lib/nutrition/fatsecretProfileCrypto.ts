import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { FatSecretConfigError } from "@/lib/fatsecret/errors";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

function getEncryptionKey(): Buffer {
  const raw = process.env.FATSECRET_PROFILE_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new FatSecretConfigError(
      "FATSECRET_PROFILE_ENCRYPTION_KEY is not configured (32-byte key, base64-encoded).",
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new FatSecretConfigError(
      "FATSECRET_PROFILE_ENCRYPTION_KEY must decode to 32 bytes (base64).",
    );
  }

  return key;
}

export function encryptFatSecretProfileSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptFatSecretProfileSecret(ciphertext: string): string {
  const payload = Buffer.from(ciphertext, "base64");
  if (payload.length <= IV_BYTES + TAG_BYTES) {
    throw new FatSecretConfigError("Stored FatSecret profile secret is invalid.");
  }

  const iv = payload.subarray(0, IV_BYTES);
  const tag = payload.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const encrypted = payload.subarray(IV_BYTES + TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

/** Generate a new random 32-byte key (base64) for FATSECRET_PROFILE_ENCRYPTION_KEY. */
export function generateFatSecretProfileEncryptionKey(): string {
  return randomBytes(KEY_BYTES).toString("base64");
}
