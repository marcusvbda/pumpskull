// Renders every scene background into public/scenes/ from the slot files.
// Usage: node scripts/scenes/generate.mjs [outDir] [id ...]   (default outDir: public/scenes)

import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { deriveAltar, renderAltar } from "./altar.mjs";
import { deriveHouse, renderHouse } from "./house.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const slotsOf = (id) => JSON.parse(readFileSync(join(root, "src/data/slots", `${id}.json`), "utf8")).slots;

const ALTAR_STYLES = {
  1: { cloths: "mixed", niche: "arch", side: "curtain", curtain: ["#be185d", "#5b0f3a"], skulls: true },
  2: { cloths: "warm", clothShift: 1, niche: "dome", side: "pillar", wall: ["#17306a", "#0f1f4a", "#080f2a"], halo: "#ffcf6b", floorTint: ["#233a78", "#0a1432"], patternShift: 2 },
  3: { cloths: "mixed", niche: "arch", side: "curtain" },
  4: { cloths: "cool", niche: "rect", side: "curtain", curtain: ["#0f766e", "#134e4a"], wall: ["#0d3b4a", "#0a2433", "#06141f"], halo: "#8af0e0", floorTint: ["#12525e", "#071c24"], patternShift: 1 },
  5: { cloths: "jewel", niche: "arch", side: "pillar", wall: ["#4a1260", "#2a0a3a", "#150520"], skulls: true, patternShift: 3 },
  6: { cloths: "warm", clothShift: 2, niche: "rect", side: "curtain", curtain: ["#b91c1c", "#5b0f1a"], wall: ["#5a1030", "#33081c", "#1a040e"], halo: "#ff8a5c", floorTint: ["#5a2040", "#1e0714"] },
  7: { cloths: "mixed", clothShift: 2, niche: "dome", side: "curtain", curtain: ["#7c3aed", "#3b1a7a"], wall: ["#2a1a7a", "#170f4a", "#0a0628"], skulls: true, patternShift: 4 },
  8: { cloths: "cool", clothShift: 1, niche: "arch", side: "pillar", wall: ["#123a5a", "#0c2540", "#06132a"], halo: "#8ad8ff", floorTint: ["#1a4a70", "#08182c"], patternShift: 5 },
  9: { cloths: "jewel", clothShift: 2, niche: "rect", side: "pillar", wall: ["#124a3a", "#0b2e2a", "#061a1a"], halo: "#ffd27a", skulls: true, floorTint: ["#1d5a48", "#08201c"] },
  10: { cloths: "warm", clothShift: 2, patternShift: 3, niche: "dome", side: "curtain", curtain: ["#db2777", "#6b0f3f"], wall: ["#3a1260", "#210a40", "#12052a"] },
};

const HOUSE_STYLES = {
  1: { wall: "#1fa39a", wallDark: "#0c5e63", roof: "#2a2552", roofDark: "#161232", trim: "#e6fff9", sky: ["#06192a", "#0f3a4f", "#2b6a7a", "#5aa0a0"], moon: [0.17, 0.13], fence: true, chimney: "left", glow: "#ffe08a" },
  2: { wall: "#e8742a", wallDark: "#a14012", roof: "#2b1b3d", roofDark: "#170e24", door: "#4a2366", trim: "#fff1dc", sky: ["#1a0b3a", "#4a1a6a", "#b0436a", "#f08a4b"], moon: [0.84, 0.16], moonColour: "#ffd8a0", moonGlow: "#ffb066", tombs: true },
  3: {},
  4: { wall: "#6fbf4a", wallDark: "#2f6b25", roof: "#1b1b26", roofDark: "#0d0d14", door: "#5a2a14", trim: "#f4ffe0", sky: ["#07181f", "#0e3340", "#1f5a5e", "#4d8a7a"], moon: [0.2, 0.12], lamp: true, fence: true, chimney: "left", glow: "#d6ff8a" },
  5: { wall: "#3b6fd6", wallDark: "#1d3a8a", roof: "#4a2a6a", roofDark: "#26143a", door: "#a3401f", trim: "#e8efff", sky: ["#080d33", "#18246a", "#3c4aa0", "#6f78c8"], moon: [0.14, 0.12], tombs: true, bats: 4 },
  6: { wall: "#d6428c", wallDark: "#8a1d5a", roof: "#2a1a4a", roofDark: "#150b2a", door: "#3a1d0f", trim: "#ffe6f2", sky: ["#14062e", "#40125a", "#8a2a7a", "#d0507a"], moon: [0.2, 0.1], moonColour: "#ffe3ef", moonGlow: "#ffb0d0", fence: true },
  7: { wall: "#6b7aa8", wallDark: "#363f66", roof: "#1d1b2e", roofDark: "#0e0d1a", door: "#2e1d3a", trim: "#e3e8ff", sky: ["#05050f", "#14143a", "#2a2060", "#503a7a"], moon: [0.8, 0.12], bats: 4, tombs: true, chimney: "left" },
  8: { wall: "#a8402f", wallDark: "#5e1d18", roof: "#26202e", roofDark: "#120f18", door: "#2a1a0f", trim: "#ffe3d6", sky: ["#1a0a2a", "#401a4a", "#8a3a4a", "#d0704a"], moon: [0.86, 0.14], moonColour: "#ffd2a0", moonGlow: "#ff9a5a", lamp: true },
  9: { wall: "#d9a516", wallDark: "#8a5e08", roof: "#3a2a6a", roofDark: "#1d1440", door: "#6a2a9a", trim: "#fff6d0", sky: ["#100a38", "#2a1a6a", "#5a3a8a", "#9a5a9a"], moon: [0.9, 0.12], fence: true, tombs: true },
  10: { wall: "#9a6fd8", wallDark: "#523a94", roof: "#1f2a4a", roofDark: "#0f1526", door: "#7a3b16", trim: "#f1e6ff", sky: ["#08143a", "#14306a", "#2a5a8a", "#5a8aa8"], moon: [0.88, 0.12], lamp: true, chimney: "left", glow: "#fff0a0" },
};

const outDir = process.argv[2] && !/^(altar|house)-\d+$/.test(process.argv[2]) ? process.argv[2] : join(root, "public/scenes");
const only = process.argv.slice(2).filter((a) => /^(altar|house)-\d+$/.test(a));
mkdirSync(join(outDir, "altar"), { recursive: true });
mkdirSync(join(outDir, "house"), { recursive: true });

for (const kind of ["altar", "house"]) {
  for (let n = 1; n <= 10; n++) {
    const id = `${kind}-${n}`;
    if (only.length && !only.includes(id)) continue;
    const slots = slotsOf(id);
    const svg = kind === "altar" ? renderAltar(deriveAltar(slots), n * 7 + 1, ALTAR_STYLES[n]) : renderHouse(deriveHouse(slots), n * 5 + 2, HOUSE_STYLES[n]);
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(join(outDir, kind, `${id}.png`));
    console.log("wrote", `${kind}/${id}.png`);
  }
}
