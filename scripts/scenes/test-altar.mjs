import sharp from "sharp";
import { renderAltar, ALTAR_3 } from "./altar.mjs";
const out = process.argv[2];
const svg = renderAltar(ALTAR_3, 3);
await sharp(Buffer.from(svg)).png().toFile(out);
console.log("ok", out);
