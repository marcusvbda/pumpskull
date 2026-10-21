// Renders the 20 item sprites into public/items/. Usage: node scripts/scenes/generate-items.mjs [outDir]
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ITEMS } from "./items.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = process.argv[2] ?? join(root, "public/items");
for (const d of ["altar", "house", "decoys"]) mkdirSync(join(outDir, d), { recursive: true });

// Sprites for the `center` anchor in src/data/items.ts; every other item stands on its bottom edge.
const CENTRED = new Set(["house/bat-lights", "house/cobweb", "house/spider", "house/ghost", "decoys/cobweb", "decoys/bat", "decoys/ghost"]);

function bounds(data, info) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

for (const [name, draw] of Object.entries(ITEMS)) {
  const file = join(outDir, `${name}.png`);
  const raw = await sharp(Buffer.from(draw())).png().toBuffer();
  const r = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = bounds(r.data, r.info);
  // Crop to the artwork, then put it back: centred, resting on y = 1008 (or centred vertically for wall items).
  const crop = await sharp(raw).extract({ left: b.x0, top: b.y0, width: b.w, height: b.h }).toBuffer();
  const left = Math.round((1024 - b.w) / 2);
  const top = CENTRED.has(name) ? Math.round((1024 - b.h) / 2) : Math.max(0, 1008 - b.h);
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: crop, left, top }]).png({ compressionLevel: 9 }).toFile(file);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  console.log(name.padEnd(24), `x ${x0}-${x1}  y ${y0}-${y1}  (${x1 - x0 + 1}x${y1 - y0 + 1})`);
}
