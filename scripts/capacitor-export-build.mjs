import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** @type {Array<{ from: string; backup: string }>} */
const dirBackups = [
  { from: "src/app/api", backup: ".capacitor-backup/app-api" },
  {
    from: "src/app/(auth)/auth/callback",
    backup: ".capacitor-backup/auth-callback",
  },
];

/** @type {Array<{ from: string; backup: string }>} */
const fileBackups = [
  { from: "src/proxy.ts", backup: ".capacitor-backup/proxy.ts" },
  {
    from: "src/app/(app)/layout.tsx",
    backup: ".capacitor-backup/layout.server.tsx",
  },
  {
    from: "src/app/(app)/layout.client.tsx",
    backup: ".capacitor-backup/layout.client.tsx",
  },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function backupPath(rel) {
  return path.join(root, rel);
}

function backupDir(fromRel, backupRel) {
  const from = backupPath(fromRel);
  const backup = backupPath(backupRel);
  if (!fs.existsSync(from)) {
    throw new Error(`Capacitor export: missing ${fromRel}`);
  }
  ensureDir(path.dirname(backup));
  if (fs.existsSync(backup)) {
    fs.rmSync(backup, { recursive: true, force: true });
  }
  fs.cpSync(from, backup, { recursive: true });
  fs.rmSync(from, { recursive: true, force: true });
}

function backupFile(fromRel, backupRel) {
  const from = backupPath(fromRel);
  const backup = backupPath(backupRel);
  if (!fs.existsSync(from)) {
    throw new Error(`Capacitor export: missing ${fromRel}`);
  }
  ensureDir(path.dirname(backup));
  fs.copyFileSync(from, backup);
  fs.rmSync(from, { force: true });
}

function restoreDir(fromRel, backupRel) {
  const from = backupPath(fromRel);
  const backup = backupPath(backupRel);
  if (!fs.existsSync(backup)) return;
  if (fs.existsSync(from)) {
    fs.rmSync(from, { recursive: true, force: true });
  }
  fs.cpSync(backup, from, { recursive: true });
  fs.rmSync(backup, { recursive: true, force: true });
}

function restoreFile(fromRel, backupRel) {
  const from = backupPath(fromRel);
  const backup = backupPath(backupRel);
  if (!fs.existsSync(backup)) return;
  fs.copyFileSync(backup, from);
  fs.rmSync(backup, { force: true });
}

function prepareExportTree() {
  ensureDir(backupPath(".capacitor-backup"));
  for (const { from, backup } of dirBackups) {
    backupDir(from, backup);
  }
  for (const { from, backup } of fileBackups) {
    backupFile(from, backup);
  }
  fs.copyFileSync(
    backupPath(".capacitor-backup/layout.client.tsx"),
    backupPath("src/app/(app)/layout.tsx"),
  );
}

function restoreExportTree() {
  fs.rmSync(backupPath("src/app/(app)/layout.tsx"), { force: true });
  restoreFile("src/app/(app)/layout.tsx", ".capacitor-backup/layout.server.tsx");
  restoreFile("src/app/(app)/layout.client.tsx", ".capacitor-backup/layout.client.tsx");
  restoreFile("src/proxy.ts", ".capacitor-backup/proxy.ts");
  for (const { from, backup } of [...dirBackups].reverse()) {
    restoreDir(from, backup);
  }
  const backupRoot = backupPath(".capacitor-backup");
  if (fs.existsSync(backupRoot)) {
    fs.rmSync(backupRoot, { recursive: true, force: true });
  }
}

let prepared = false;

if (fs.existsSync(backupPath(".capacitor-backup/app-api"))) {
  console.error(
    "Capacitor export: stale .capacitor-backup detected (prior export did not restore).",
  );
  console.error("Run: node scripts/capacitor-restore.mjs");
  process.exit(1);
}

try {
  prepareExportTree();
  prepared = true;

  const env = {
    ...process.env,
    CAPACITOR_BUILD: "1",
    NEXT_PUBLIC_CAPACITOR: "1",
    NEXT_PUBLIC_API_ORIGIN:
      process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://myexercise.dev",
    NEXT_PUBLIC_NATIVE_BUILD:
      process.env.NATIVE_BUILD ?? process.env.npm_package_version ?? "1",
  };

  console.log("Capacitor export: running next build (static export)…");
  const result = spawnSync("npm", ["run", "build"], {
    cwd: root,
    env,
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const outIndex = path.join(root, "out", "index.html");
  if (!fs.existsSync(outIndex)) {
    throw new Error("Capacitor export: out/index.html missing after build");
  }

  console.log("Capacitor export: OK → out/");
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  if (prepared) {
    restoreExportTree();
    if (
      !fs.existsSync(backupPath("src/app/api/version/route.ts")) ||
      !fs.existsSync(backupPath("src/proxy.ts"))
    ) {
      console.error(
        "Capacitor export: restore incomplete — run: node scripts/capacitor-restore.mjs",
      );
      process.exit(1);
    }
  }
}
