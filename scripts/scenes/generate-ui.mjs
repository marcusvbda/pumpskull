// Renders the small UI art: difficulty candies and team badges (public/ui/, 256x256) plus the app icon and
// public/brand/favicon.png (512x512, from the mascot). Usage: node scripts/scenes/generate-ui.mjs
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { INK, commonDefs } from "./lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const svg = (inner, defs = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs>${commonDefs()}${defs}</defs>${inner}</svg>`;
const ink = (w = 6) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const lg = (id, a, b, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

const chocolate = () => svg(`
  <ellipse cx="128" cy="236" rx="86" ry="8" fill="#000" opacity="0.18"/>
  <g transform="rotate(-14 128 128)">
    <rect x="50" y="62" width="156" height="132" rx="14" fill="url(#choc)" ${ink(7)}/>
    ${[0, 1, 2].flatMap((c) => [0, 1, 2].map((r) => `<rect x="${60 + c * 48}" y="${72 + r * 40}" width="42" height="34" rx="6" fill="url(#chocin)" stroke="#2a1208" stroke-width="3"/><path d="M${64 + c * 48} ${78 + r * 40} h30" stroke="#fff" stroke-opacity="0.22" stroke-width="4" stroke-linecap="round"/>`)).join("")}
    <path d="M44 150 H212 V206 Q128 222 44 206Z" fill="url(#foil)" ${ink(7)}/>
    <path d="M60 170 Q128 184 196 170 M60 186 Q128 200 196 186" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="4"/>
  </g>`, lg("choc", "#8a4a26", "#4a220e") + lg("chocin", "#a45a30", "#5e2c12") + lg("foil", "#fde68a", "#d99a1c"));

const gummy = () => svg(`
  <ellipse cx="128" cy="238" rx="74" ry="8" fill="#000" opacity="0.18"/>
  <circle cx="82" cy="58" r="26" fill="url(#gum)" ${ink(7)}/><circle cx="174" cy="58" r="26" fill="url(#gum)" ${ink(7)}/>
  <circle cx="82" cy="58" r="12" fill="#fff" opacity="0.35"/><circle cx="174" cy="58" r="12" fill="#fff" opacity="0.35"/>
  <path d="M60 192 C40 178 44 140 60 132 C70 126 72 118 72 110 C72 80 92 66 128 66 C164 66 184 80 184 110 C184 118 186 126 196 132 C212 140 216 178 196 192 C186 208 178 232 162 234 C150 236 144 226 128 226 C112 226 106 236 94 234 C78 232 70 208 60 192Z" fill="url(#gum)" ${ink(7)}/>
  <path d="M90 100 C86 120 90 140 98 156" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="10" stroke-linecap="round"/>
  <circle cx="106" cy="104" r="8" fill="${INK}"/><circle cx="150" cy="104" r="8" fill="${INK}"/><circle cx="108" cy="101" r="3" fill="#fff"/><circle cx="152" cy="101" r="3" fill="#fff"/>
  <ellipse cx="128" cy="124" rx="16" ry="11" fill="#e9fbb0" ${ink(4)}/><path d="M122 122 h12" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  <path d="M112 142 Q128 156 144 142" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
  ${Array.from({ length: 22 }, (_, i) => `<circle cx="${70 + ((i * 37) % 120)}" cy="${84 + ((i * 53) % 130)}" r="2.6" fill="#fff" opacity="0.9"/>`).join("")}`, `<radialGradient id="gum" cx="0.38" cy="0.3" r="0.8"><stop offset="0" stop-color="#d6ff6a"/><stop offset="0.6" stop-color="#7bd218"/><stop offset="1" stop-color="#3f8a0a"/></radialGradient>`);

const chili = () => svg(`
  <ellipse cx="128" cy="238" rx="80" ry="8" fill="#000" opacity="0.18"/>
  <path d="M168 66 C214 80 232 130 206 180 C186 220 130 238 84 224 C60 216 56 198 74 192 C120 184 150 170 164 134 C174 108 164 86 168 66Z" fill="url(#pep)" ${ink(7)}/>
  <path d="M184 100 C196 130 190 160 170 184 C150 204 120 212 96 214" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="10" stroke-linecap="round"/>
  <path d="M158 62 C150 44 158 28 176 22 C176 36 190 40 198 38 C204 52 196 70 174 78 C166 74 160 70 158 62Z" fill="#22a04a" ${ink(7)}/>
  <path d="M178 24 C172 14 180 6 192 6" fill="none" stroke="#2f7a2a" stroke-width="9" stroke-linecap="round"/>
  <g transform="translate(70 70) rotate(-24)"><path d="M0 0 C-30 14 -34 54 -10 70 C14 84 44 70 46 40 C48 14 24 -8 0 0Z" fill="#8a4a22" ${ink(6)}/><path d="M-16 24 q22 -10 40 4 M-12 44 q20 -8 38 2" fill="none" stroke="#5e2c12" stroke-width="4"/><path d="M-6 8 C-18 24 -20 44 -10 56" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="6" stroke-linecap="round"/></g>`, `<linearGradient id="pep" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6a4a"/><stop offset="0.6" stop-color="#e11d2a"/><stop offset="1" stop-color="#8a0c18"/></linearGradient>`);

const badge = (inner, ring, bgA, bgB) => svg(`
  <circle cx="128" cy="128" r="118" fill="url(#bg)" ${ink(8)}/>
  <circle cx="128" cy="128" r="104" fill="none" stroke="${ring}" stroke-width="8" stroke-dasharray="2 14" stroke-linecap="round" opacity="0.9"/>
  ${inner}
  <path d="M40 90 C60 50 110 30 160 36" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="10" stroke-linecap="round"/>`, `<radialGradient id="bg" cx="0.4" cy="0.3" r="0.9"><stop offset="0" stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/></radialGradient>`);

const teamMarigold = () => badge(`<use href="#marigold" transform="translate(128 128) scale(2.5)"/><use href="#marigold-small" transform="translate(54 62) scale(1.2) rotate(20)"/><use href="#marigold-small" transform="translate(204 192) scale(1.2) rotate(60)"/>`, "#fde68a", "#14b8a6", "#0b4f57");
const teamPumpkin = () => badge(`
  <g transform="translate(128 134)">
    <path d="M0 -62 C-66 -70 -96 -20 -92 22 C-88 64 -48 80 0 80 C48 80 88 64 92 22 C96 -20 66 -70 0 -62Z" fill="#ff9a2a" ${ink(7)}/>
    <path d="M0 -60 C-22 -30 -24 50 0 78 C24 50 22 -30 0 -60Z" fill="#c2480a" opacity="0.35"/>
    <path d="M0 -62 C-4 -80 8 -92 24 -96" fill="none" stroke="#2f6b1a" stroke-width="14" stroke-linecap="round"/>
    <path d="M-58 -6 L-22 -22 L-20 12Z M58 -6 L22 -22 L20 12Z M0 14 L-12 34 H12Z" fill="#ffe27a" ${ink(5)}/>
    <path d="M-52 36 C-30 66 30 66 52 36 C34 46 22 40 10 50 C0 44 -10 50 -22 44 C-34 48 -40 42 -52 36Z" fill="#ffe27a" ${ink(5)}/>
  </g>`, "#fde68a", "#a855f7", "#3b1a7a");

const jobs = { "ui/candy-chocolate": chocolate, "ui/candy-sour-gummy": gummy, "ui/candy-chili-tamarind": chili, "ui/team-marigold": teamMarigold, "ui/team-pumpkin": teamPumpkin };
for (const [name, draw] of Object.entries(jobs)) {
  await sharp(Buffer.from(draw())).png({ compressionLevel: 9 }).toFile(join(root, "public", `${name}.png`));
  console.log("wrote", `${name}.png`);
}

// App icon and favicon: the mascot on a rounded night-purple tile, so it reads at 32 px on any browser tab.
const mascot = join(root, "public/brand/mascot-easy.png");
const trimmed = await sharp(mascot).trim({ threshold: 10 }).toBuffer();
const art = await sharp(trimmed).resize(400, 400, { fit: "inside" }).toBuffer();
const tile = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs><radialGradient id="t" cx="0.4" cy="0.3" r="0.9"><stop offset="0" stop-color="#4b2a9a"/><stop offset="1" stop-color="#1a0b3d"/></radialGradient></defs><rect width="512" height="512" rx="112" fill="url(#t)"/></svg>`);
const icon = await sharp(tile).composite([{ input: art, gravity: "centre" }]).png({ compressionLevel: 9 }).toBuffer();
await sharp(icon).toFile(join(root, "src/app/icon.png"));
await sharp(icon).toFile(join(root, "public/brand/favicon.png"));
console.log("wrote src/app/icon.png and public/brand/favicon.png");
