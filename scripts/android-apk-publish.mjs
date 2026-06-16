import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { semverToAndroidVersionCode } from "./lib/semver-version-code.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(root, "android");
const gradleWrapper =
  process.platform === "win32" ? "gradlew.bat" : "gradlew";
const debugApk = path.join(
  androidDir,
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);
const publishDir = path.join(root, "public", "downloads");
const publishApk = path.join(publishDir, "myexercise.apk");

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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: options.env,
    stdio: "inherit",
    shell: true,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

const env = { ...process.env, CAPACITOR_SERVER_URL: "https://myexercise.dev" };
const javaHome = resolveJavaHome();
if (javaHome) {
  env.JAVA_HOME = javaHome;
  const javaBin = path.join(javaHome, "bin");
  env.PATH = env.PATH ? `${javaBin}${path.delimiter}${env.PATH}` : javaBin;
} else {
  console.error(
    "JAVA_HOME is not set and Android Studio JBR was not found. Install Android Studio or set JAVA_HOME.",
  );
  process.exit(1);
}

console.log("Syncing Capacitor (remote → myexercise.dev)…");
run("npx", ["cap", "sync", "android"], { env });

const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
const versionName = String(packageJson.version ?? "1.0.0");
const versionCode = semverToAndroidVersionCode(versionName);

const gradlePath = path.join(androidDir, "app", "build.gradle");
let gradle = fs.readFileSync(gradlePath, "utf8");
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(
  /versionName\s+"[^"]*"/,
  `versionName "${versionName}"`,
);
fs.writeFileSync(gradlePath, gradle);
console.log(`Stamped Android versionName ${versionName} (versionCode ${versionCode})`);

console.log("Building debug APK…");
run(path.join(androidDir, gradleWrapper), ["assembleDebug"], {
  cwd: androidDir,
  env,
});

if (!fs.existsSync(debugApk)) {
  console.error(`Expected APK at ${debugApk}`);
  process.exit(1);
}

fs.mkdirSync(publishDir, { recursive: true });
fs.copyFileSync(debugApk, publishApk);

const sizeMb = (fs.statSync(publishApk).size / (1024 * 1024)).toFixed(1);
console.log("");
console.log(`Published ${publishApk} (${sizeMb} MB)`);
console.log("Local URL:  http://localhost:3000/downloads/myexercise.apk");
console.log("Production: https://myexercise.dev/downloads/myexercise.apk");
console.log("");
console.log("Commit public/downloads/myexercise.apk and deploy to Vercel.");
console.log(`APK version: ${versionName} (versionCode ${versionCode})`);
