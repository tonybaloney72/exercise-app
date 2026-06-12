/**
 * Generates PWA icons from public/branding/ME_Logo_Simple.png
 * Run: node scripts/generate-pwa-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "public/branding/ME_Logo_Simple.png");
const publicDir = path.join(root, "public");

if (!fs.existsSync(src)) {
  console.error("Missing source:", src);
  process.exit(1);
}

const appDir = path.join(root, "src/app");

async function writeIcon(outPath, size) {
  await sharp(src)
    .resize(size, size, { fit: "contain", background: "#0f1117" })
    .png()
    .toFile(outPath);
}

const publicSizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of publicSizes) {
  const out = path.join(publicDir, name);
  await writeIcon(out, size);
  console.log("Wrote public/", name);
}

// Next.js App Router favicon / apple-icon (Chrome & Android fall back here if manifest icons 404)
await writeIcon(path.join(appDir, "icon.png"), 512);
console.log("Wrote src/app/icon.png");
await writeIcon(path.join(appDir, "apple-icon.png"), 180);
console.log("Wrote src/app/apple-icon.png");

// Simple splash (portrait phone) - brand mark centered on theme background
const splashPath = path.join(publicDir, "apple-splash-1170x2532.png");
await sharp({
  create: {
    width: 1170,
    height: 2532,
    channels: 4,
    background: "#0f1117",
  },
})
  .composite([
    {
      input: await sharp(src)
        .resize(280, 280, { fit: "contain", background: "#0f1117" })
        .png()
        .toBuffer(),
      gravity: "center",
    },
  ])
  .png()
  .toFile(splashPath);
console.log("Wrote apple-splash-1170x2532.png");
