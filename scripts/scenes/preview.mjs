// Puts sprites on a scene at its slot positions, to judge them together. Usage: node scripts/scenes/preview.mjs <scene-id> <out.png> <item,item,...>
import { readFileSync } from "node:fs";
import sharp from "sharp";

const [, , id, out, list] = process.argv;
const kind = id.split("-")[0];
const slots = JSON.parse(readFileSync(`src/data/slots/${id}.json`, "utf8")).slots;
const items = list.split(",");
const CENTRE = new Set(["cobweb", "bat", "ghost", "spider", "bat-lights"]);
const W = 2048, H = 1280;
const comps = [];
for (let i = 0; i < slots.length; i++) {
  const slot = slots[i], item = items[i % items.length];
  const dir = kind === "altar" ? (["pumpkin"].includes(item) ? "decoys" : "altar") : ["bat"].includes(item) ? "decoys" : "house";
  const size = Math.round(slot.scale * W);
  const input = await sharp(`public/items/${dir}/${item}.png`).resize(size, size).toBuffer();
  const left = Math.round(slot.x * W - size / 2);
  const top = Math.round(slot.y * H - (CENTRE.has(item) ? size / 2 : size));
  comps.push({ input, left, top });
}
await sharp(`public/scenes/${kind}/${id}.png`).composite(comps).resize(1400).png().toFile(out);
