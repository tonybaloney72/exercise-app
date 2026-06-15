/**
 * Restore src tree if `build:capacitor` failed mid-flight and left `.capacitor-backup/`.
 * Safe to run anytime — no-op when backup folder is absent.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backupRoot = path.join(root, ".capacitor-backup");

function p(rel) {
  return path.join(root, rel);
}

function restoreDir(fromRel, backupRel) {
  const from = p(fromRel);
  const backup = p(backupRel);
  if (!fs.existsSync(backup)) return false;
  if (fs.existsSync(from)) {
    fs.rmSync(from, { recursive: true, force: true });
  }
  fs.cpSync(backup, from, { recursive: true });
  return true;
}

function restoreFile(fromRel, backupRel) {
  const from = p(fromRel);
  const backup = p(backupRel);
  if (!fs.existsSync(backup)) return false;
  fs.copyFileSync(backup, from);
  return true;
}

if (!fs.existsSync(backupRoot)) {
  console.log("Capacitor restore: nothing to do (no .capacitor-backup).");
  process.exit(0);
}

console.log("Capacitor restore: recovering from .capacitor-backup …");

if (fs.existsSync(p("src/app/(app)/layout.tsx"))) {
  fs.rmSync(p("src/app/(app)/layout.tsx"), { force: true });
}

restoreFile("src/app/(app)/layout.tsx", ".capacitor-backup/layout.server.tsx");
restoreFile("src/app/(app)/layout.client.tsx", ".capacitor-backup/layout.client.tsx");
restoreFile("src/proxy.ts", ".capacitor-backup/proxy.ts");
restoreDir("src/app/(auth)/auth/callback", ".capacitor-backup/auth-callback");
restoreDir("src/app/api", ".capacitor-backup/app-api");

fs.rmSync(backupRoot, { recursive: true, force: true });

if (!fs.existsSync(p("src/app/api/version/route.ts")) || !fs.existsSync(p("src/proxy.ts"))) {
  console.error("Capacitor restore: incomplete — check git status and restore manually.");
  process.exit(1);
}

console.log("Capacitor restore: OK (api routes, proxy, server layout restored).");
