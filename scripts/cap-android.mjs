import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] ?? "remote";
const runDevice = process.argv.includes("--run");

/** Android Studio ships a JBR; Gradle needs JAVA_HOME on Windows if not set globally. */
function resolveJavaHome() {
  if (process.env.JAVA_HOME) {
    return process.env.JAVA_HOME;
  }

  const candidates = [];
  if (process.platform === "win32") {
    const pf = process.env["ProgramFiles"] ?? "C:\\Program Files";
    const local = process.env.LOCALAPPDATA ?? "";
    candidates.push(
      path.join(pf, "Android", "Android Studio", "jbr"),
      path.join(local, "Programs", "Android", "Android Studio", "jbr"),
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
    );
  } else {
    candidates.push(
      path.join(process.env.HOME ?? "", "android-studio", "jbr"),
      "/opt/android-studio/jbr",
    );
  }

  for (const home of candidates) {
    const javaBin =
      process.platform === "win32"
        ? path.join(home, "bin", "java.exe")
        : path.join(home, "bin", "java");
    if (fs.existsSync(javaBin)) {
      return home;
    }
  }

  return null;
}

const env = { ...process.env };

const javaHome = resolveJavaHome();
if (javaHome) {
  env.JAVA_HOME = javaHome;
  const javaBin = path.join(javaHome, "bin");
  env.PATH = env.PATH ? `${javaBin}${path.delimiter}${env.PATH}` : javaBin;
} else if (runDevice) {
  console.warn(
    "Warning: JAVA_HOME is not set and Android Studio JBR was not found.",
  );
  console.warn(
    "Install Android Studio or set JAVA_HOME to a JDK 17+ before `cap run android`.",
  );
}

if (mode === "remote") {
  env.CAPACITOR_SERVER_URL = "https://myexercise.dev";
} else if (mode === "dev") {
  env.CAPACITOR_SERVER_URL = "http://10.0.2.2:3000";
} else if (mode === "bundle") {
  delete env.CAPACITOR_SERVER_URL;
} else {
  console.error(`Unknown mode: ${mode}. Use remote | dev | bundle`);
  process.exit(1);
}

const args = runDevice ? ["cap", "run", "android"] : ["cap", "sync", "android"];
const result = spawnSync("npx", args, {
  cwd: root,
  env,
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
