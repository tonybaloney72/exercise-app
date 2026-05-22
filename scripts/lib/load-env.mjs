/**
 * Load .env.local / .env for Node catalog scripts (Next.js does not run here).
 * Does not override variables already set in the shell.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { ROOT } from "./catalog-parse.mjs";

function unquote(value) {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) return null;
  const key = trimmed.slice(0, eq).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;
  return { key, value: unquote(trimmed.slice(eq + 1)) };
}

/**
 * @param {string} [root]
 */
export function loadEnvFiles(root = ROOT) {
  for (const name of [".env", ".env.local"]) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      if (process.env[parsed.key] === undefined) {
        process.env[parsed.key] = parsed.value;
      }
    }
  }
}
