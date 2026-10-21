import sharp from "sharp";
import { renderHouse, HOUSE_3 } from "./house.mjs";
await sharp(Buffer.from(renderHouse(HOUSE_3, 5))).png().toFile(process.argv[2]);
console.log("ok");
