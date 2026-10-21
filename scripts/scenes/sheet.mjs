// Contact sheet of generated scenes for quick review. Usage: node scripts/scenes/sheet.mjs <dir> <altar|house> <from> <to> <out.png>
import sharp from "sharp";
const [,, dir, kind, from, to, outFile] = process.argv;
const ids = []; for (let i = +from; i <= +to; i++) ids.push(i);
const w = 800, h = 500, cols = 2, rows = Math.ceil(ids.length / cols);
const comps = [];
for (let k = 0; k < ids.length; k++) {
  const buf = await sharp(`${dir}/${kind}/${kind}-${ids[k]}.png`).resize(w, h).png().toBuffer();
  comps.push({ input: buf, left: (k % cols) * w, top: Math.floor(k / cols) * h });
}
await sharp({ create: { width: cols * w, height: rows * h, channels: 3, background: "#000" } }).composite(comps).png().toFile(outFile);
