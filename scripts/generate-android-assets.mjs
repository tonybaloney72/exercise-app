/**
 * Generates Android launcher icons and splash screens from ME_Logo_Simple.png.
 * Run: node scripts/generate-android-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "public/branding/ME_Logo_Simple.png");
const resDir = path.join(root, "android/app/src/main/res");
const THEME_BG = "#0f1117";

if (!fs.existsSync(src)) {
  console.error("Missing source:", src);
  process.exit(1);
}

const LAUNCHER_DENSITIES = {
  "mipmap-mdpi": { launcher: 48, foreground: 108 },
  "mipmap-hdpi": { launcher: 72, foreground: 162 },
  "mipmap-xhdpi": { launcher: 96, foreground: 216 },
  "mipmap-xxhdpi": { launcher: 144, foreground: 324 },
  "mipmap-xxxhdpi": { launcher: 192, foreground: 432 },
};

const SPLASHES = [
  { dir: "drawable", width: 480, height: 320 },
  { dir: "drawable-port-mdpi", width: 320, height: 480 },
  { dir: "drawable-port-hdpi", width: 480, height: 800 },
  { dir: "drawable-port-xhdpi", width: 720, height: 1280 },
  { dir: "drawable-port-xxhdpi", width: 960, height: 1600 },
  { dir: "drawable-port-xxxhdpi", width: 1280, height: 1920 },
  { dir: "drawable-land-mdpi", width: 480, height: 320 },
  { dir: "drawable-land-hdpi", width: 800, height: 480 },
  { dir: "drawable-land-xhdpi", width: 1280, height: 720 },
  { dir: "drawable-land-xxhdpi", width: 1600, height: 960 },
  { dir: "drawable-land-xxxhdpi", width: 1920, height: 1280 },
];

async function writeLauncherIcon(outPath, size) {
  const logoSize = Math.round(size * 0.62);
  const logo = await sharp(src)
    .resize(logoSize, logoSize, { fit: "contain", background: THEME_BG })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: THEME_BG,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(outPath);
}

async function writeForeground(outPath, size) {
  const logoSize = Math.round(size * 0.58);
  const logo = await sharp(src)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(outPath);
}

async function writeSplash(outPath, width, height) {
  const logoSize = Math.round(Math.min(width, height) * 0.34);
  const logo = await sharp(src)
    .resize(logoSize, logoSize, { fit: "contain", background: THEME_BG })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: THEME_BG,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(outPath);
}

for (const [folder, sizes] of Object.entries(LAUNCHER_DENSITIES)) {
  const dir = path.join(resDir, folder);
  fs.mkdirSync(dir, { recursive: true });
  for (const name of ["ic_launcher.png", "ic_launcher_round.png"]) {
    const out = path.join(dir, name);
    await writeLauncherIcon(out, sizes.launcher);
    console.log("Wrote", path.relative(root, out));
  }
  const fg = path.join(dir, "ic_launcher_foreground.png");
  await writeForeground(fg, sizes.foreground);
  console.log("Wrote", path.relative(root, fg));
}

for (const { dir, width, height } of SPLASHES) {
  const outDir = path.join(resDir, dir);
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, "splash.png");
  await writeSplash(out, width, height);
  console.log("Wrote", path.relative(root, out), `(${width}x${height})`);
}

console.log("Android assets generated from ME_Logo_Simple.png");
