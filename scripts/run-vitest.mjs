/**
 * Launch Vitest with a Windows drive-letter–normalized cwd.
 * Cursor/Git Bash often start in `c:\...` (lowercase); Vitest 4 then fails
 * suite collection with `Cannot read properties of undefined (reading 'config')`.
 * @see https://github.com/vitest-dev/vitest/issues/10692
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

function withUppercaseDrive(p) {
  return process.platform === "win32" && /^[a-z]:/.test(p)
    ? p[0].toUpperCase() + p.slice(1)
    : p;
}

const root = withUppercaseDrive(
  path.resolve(fileURLToPath(new URL("..", import.meta.url))),
);

const vitestBin = path.join(root, "node_modules", "vitest", "vitest.mjs");
const result = spawnSync(process.execPath, [vitestBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: root,
  env: process.env,
});

process.exit(result.status ?? 1);
