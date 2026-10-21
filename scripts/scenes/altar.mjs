// Day of the Dead altar background, drawn from the slots in src/data/slots/<id>.json so the art always matches
// where items land: `deriveAltar` turns the step / shelf / floor slots into tiers and shelves, `renderAltar` paints
// them. `style` only changes the look (colours, niche shape, curtains or pillars, sugar skulls).

import { INK, W, H, fx, fy, rng, flagString, garland, svgWrap, finish, vignetteDef } from "./lib.mjs";

const CLOTH_SETS = {
  warm: [
    { a: "#fb923c", b: "#c2410c", trim: "#fde68a" },
    { a: "#fbbf24", b: "#b45309", trim: "#fff7ed" },
    { a: "#ec4899", b: "#9d174d", trim: "#fde68a" },
  ],
  mixed: [
    { a: "#fb923c", b: "#c2410c", trim: "#fde68a" },
    { a: "#2dd4bf", b: "#0f766e", trim: "#fde68a" },
    { a: "#ec4899", b: "#9d174d", trim: "#fde68a" },
    { a: "#a78bfa", b: "#5b21b6", trim: "#fde68a" },
    { a: "#fbbf24", b: "#b45309", trim: "#fff7ed" },
  ],
  cool: [
    { a: "#2dd4bf", b: "#0f766e", trim: "#fde68a" },
    { a: "#38bdf8", b: "#0369a1", trim: "#fff7ed" },
    { a: "#a78bfa", b: "#5b21b6", trim: "#fde68a" },
    { a: "#f472b6", b: "#9d174d", trim: "#fde68a" },
  ],
  jewel: [
    { a: "#f43f5e", b: "#9f1239", trim: "#fde68a" },
    { a: "#fbbf24", b: "#b45309", trim: "#fff7ed" },
    { a: "#22d3ee", b: "#0e7490", trim: "#fde68a" },
    { a: "#c084fc", b: "#6b21a8", trim: "#fde68a" },
    { a: "#fb923c", b: "#c2410c", trim: "#fff7ed" },
  ],
};

function patterns() {
  return `
  <pattern id="p-zig" width="44" height="30" patternUnits="userSpaceOnUse"><path d="M0 24 L11 6 L22 24 L33 6 L44 24" fill="none" stroke="#fff" stroke-opacity="0.75" stroke-width="4" stroke-linejoin="round"/></pattern>
  <pattern id="p-dia" width="46" height="34" patternUnits="userSpaceOnUse"><polygon points="23,3 40,17 23,31 6,17" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="3.5"/><circle cx="23" cy="17" r="4" fill="#fff" fill-opacity="0.8"/></pattern>
  <pattern id="p-flo" width="52" height="34" patternUnits="userSpaceOnUse"><g fill="#fff" fill-opacity="0.9"><circle cx="26" cy="17" r="4.5"/><circle cx="26" cy="7" r="4"/><circle cx="26" cy="27" r="4"/><circle cx="16" cy="17" r="4"/><circle cx="36" cy="17" r="4"/></g></pattern>
  <pattern id="p-tri" width="36" height="30" patternUnits="userSpaceOnUse"><path d="M3 26 L18 6 L33 26 Z" fill="#fff" fill-opacity="0.78"/></pattern>
  <pattern id="p-wave" width="48" height="30" patternUnits="userSpaceOnUse"><path d="M0 15 Q12 0 24 15 T48 15" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="4"/></pattern>
  <pattern id="p-star" width="44" height="34" patternUnits="userSpaceOnUse"><path d="M22 4 L26 14 L37 14 L28 21 L31 31 L22 25 L13 31 L16 21 L7 14 L18 14 Z" fill="#fff" fill-opacity="0.8"/></pattern>`;
}

const PATTERN_IDS = ["p-zig", "p-dia", "p-flo", "p-tri", "p-wave", "p-star"];

// Slots -> tiers (staircase widening downwards) and shelves.
export function deriveAltar(slots, floor = 0.84) {
  const steps = new Map();
  for (const s of slots.filter((s) => s.type === "step")) {
    if (!steps.has(s.y)) steps.set(s.y, []);
    steps.get(s.y).push(s.x);
  }
  const tiers = [];
  [...steps.entries()].sort((a, b) => a[0] - b[0]).forEach(([top, xs], i) => {
    let left = Math.min(...xs) - 0.0665;
    let right = Math.max(...xs) + 0.0665;
    if (i > 0) {
      left = Math.min(left, tiers[i - 1].left - 0.06);
      right = Math.max(right, tiers[i - 1].right + 0.06);
    }
    tiers.push({ top, left: Math.max(0.03, left), right: Math.min(0.97, right) });
  });
  const shelves = slots.filter((s) => s.type === "shelf").map((s) => ({ x: s.x, y: s.y }));
  return { tiers, shelves, floor };
}

function skullDef() {
  const face = (accent) => `
    <ellipse cx="0" cy="0" rx="30" ry="34" fill="#fff8ee" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="-11" cy="-5" rx="9.5" ry="10.5" fill="#1b1033"/><ellipse cx="11" cy="-5" rx="9.5" ry="10.5" fill="#1b1033"/>
    <circle cx="-11" cy="-5" r="14" fill="none" stroke="${accent}" stroke-width="4"/><circle cx="11" cy="-5" r="14" fill="none" stroke="${accent}" stroke-width="4"/>
    <circle cx="-11" cy="-5" r="3.5" fill="${accent}"/><circle cx="11" cy="-5" r="3.5" fill="${accent}"/>
    <path d="M0 6 L-5 16 H5 Z" fill="#1b1033"/>
    <path d="M-14 22 Q0 30 14 22" fill="none" stroke="${INK}" stroke-width="3"/><path d="M-8 22 v7 M0 24 v7 M8 22 v7" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="0" cy="-24" r="3.5" fill="${accent}"/><circle cx="-8" cy="-22" r="2.5" fill="#fbbf24"/><circle cx="8" cy="-22" r="2.5" fill="#fbbf24"/>`;
  return `<g id="skull-a">${face("#ec4899")}</g><g id="skull-b">${face("#2dd4bf")}</g><g id="skull-c">${face("#fb923c")}</g>`;
}

export function renderAltar(cfg, seed = 1, style = {}) {
  const rand = rng(seed);
  const { tiers, shelves = [], floor = 0.84 } = cfg;
  const {
    cloths = "mixed", clothShift = 0, patternShift = 0,
    wall = ["#3b1480", "#220c52", "#12062e"], halo = "#ffb347", niche = "arch", side = "curtain",
    curtain = ["#be185d", "#5b0f3a"], skulls = false, floorTint = ["#4a2368", "#1a0a33"], flagRows = 1,
  } = style;
  const CL = CLOTH_SETS[cloths];
  const floorY = fy(floor);

  let defs = patterns() + vignetteDef(0.6) + skullDef();
  defs += `
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wall[0]}"/><stop offset="0.55" stop-color="${wall[1]}"/><stop offset="1" stop-color="${wall[2]}"/></linearGradient>
  <radialGradient id="halo" cx="50%" cy="38%" r="50%"><stop offset="0" stop-color="${halo}" stop-opacity="0.55"/><stop offset="0.5" stop-color="${halo}" stop-opacity="0.18"/><stop offset="1" stop-color="${halo}" stop-opacity="0"/></radialGradient>
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${floorTint[0]}"/><stop offset="1" stop-color="${floorTint[1]}"/></linearGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b45309"/><stop offset="0.5" stop-color="#fde68a"/><stop offset="1" stop-color="#b45309"/></linearGradient>
  <linearGradient id="curtain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${curtain[0]}"/><stop offset="1" stop-color="${curtain[1]}"/></linearGradient>
  <linearGradient id="stone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a1b52"/><stop offset="0.35" stop-color="#6a56a8"/><stop offset="0.65" stop-color="#4a3a86"/><stop offset="1" stop-color="#241646"/></linearGradient>
  <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a4b"/><stop offset="1" stop-color="#7a4520"/></linearGradient>
  <pattern id="p-brick" width="64" height="40" patternUnits="userSpaceOnUse"><path d="M0 20 H64 M32 0 V20 M0 20 V40 M64 20 V40" stroke="#000" stroke-opacity="0.12" stroke-width="2" fill="none"/></pattern>
  <pattern id="p-niche" width="56" height="56" patternUnits="userSpaceOnUse"><polygon points="28,6 50,28 28,50 6,28" fill="none" stroke="#fff" stroke-opacity="0.06" stroke-width="2"/></pattern>`;

  let s = `<rect width="${W}" height="${H}" fill="url(#wall)"/><rect width="${W}" height="${H}" fill="url(#p-brick)"/>`;

  // Niche (retablo) framing the altar.
  const nx0 = fx(0.115), nx1 = fx(0.885);
  const rx = (nx1 - nx0) / 2;
  let nichePath;
  if (niche === "rect") {
    const top = fy(0.14);
    nichePath = `M${nx0} ${floorY} V${top} H${nx1} V${floorY} Z`;
  } else if (niche === "dome") {
    nichePath = `M${nx0} ${floorY} V${fy(0.4)} C${nx0} ${fy(0.02)} ${nx1} ${fy(0.02)} ${nx1} ${fy(0.4)} V${floorY} Z`;
  } else {
    nichePath = `M${nx0} ${floorY} V${fy(0.34)} A${rx} ${fy(0.34) - fy(0.115)} 0 0 1 ${nx1} ${fy(0.34)} V${floorY} Z`;
  }
  s += `<path d="${nichePath}" fill="#190842" stroke="url(#gold)" stroke-width="14"/><path d="${nichePath}" fill="url(#p-niche)"/><path d="${nichePath}" fill="url(#halo)"/>`;
  if (niche === "rect") {
    for (let x = nx0; x < nx1; x += 48) s += `<path d="M${x} ${fy(0.14)} q24 40 48 0" fill="#fbbf24" stroke="${INK}" stroke-width="3" opacity="0.9"/>`;
  }

  // Warm bokeh (candle glow).
  for (let i = 0; i < 26; i++) {
    const x = fx(0.16 + rand() * 0.68), y = fy(0.14 + rand() * 0.6), r = 10 + rand() * 26;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${halo}" opacity="${(0.06 + rand() * 0.1).toFixed(2)}" filter="url(#soft-sm)"/>`;
  }

  // Sugar skulls hanging along the top of the niche, away from the item area in the middle.
  if (skulls) {
    for (let i = 0; i < 7; i++) {
      const x = i < 4 ? 0.2 + i * 0.045 : 0.66 + (i - 4) * 0.045;
      const y = 0.2 - Math.abs(x - 0.5) * 0.28;
      s += `<line x1="${fx(x)}" y1="${fy(0.1)}" x2="${fx(x)}" y2="${fy(y) - 30}" stroke="${INK}" stroke-width="3"/><use href="#skull-${"abc"[i % 3]}" transform="translate(${fx(x)} ${fy(y)}) scale(0.9)"/>`;
    }
  }

  // Sides: curtains tied with a cord, or carved pillars wrapped in marigolds.
  if (side === "pillar") {
    for (const x0 of [0, fx(0.9)]) {
      const w = fx(0.1);
      s += `<rect x="${x0}" y="0" width="${w}" height="${floorY}" fill="url(#stone)" stroke="${INK}" stroke-width="5"/>`;
      for (let y = 40; y < floorY; y += 150) s += `<rect x="${x0 - 4}" y="${y}" width="${w + 8}" height="18" fill="url(#gold)" stroke="${INK}" stroke-width="3"/>`;
      s += `<rect x="${x0 - 10}" y="0" width="${w + 20}" height="34" fill="url(#gold)" stroke="${INK}" stroke-width="4"/><rect x="${x0 - 10}" y="${floorY - 34}" width="${w + 20}" height="34" fill="url(#gold)" stroke="${INK}" stroke-width="4"/>`;
      s += garland([x0 + w * 0.2, 60], [x0 + w * 0.9, floorY * 0.4], [x0 + w * 0.2, floorY - 80], 11, { size: 0.7 });
    }
  } else {
    for (const sd of ["l", "r"]) {
      const x0 = sd === "l" ? 0 : fx(0.9), x1 = sd === "l" ? fx(0.1) : W;
      const k = sd === "l" ? -1 : 1;
      const path = `M${x0} 0 H${x1} C${x1 + 30 * k} ${fy(0.35)} ${x1 + 50 * k} ${fy(0.55)} ${x1 + 20 * k} ${floorY} H${x0} Z`;
      s += `<path d="${path}" fill="url(#curtain)"/><path d="${path}" fill="url(#folds)"/>
        <path d="M${sd === "l" ? 0 : W} ${fy(0.5)} Q${fx(sd === "l" ? 0.06 : 0.94)} ${fy(0.55)} ${fx(sd === "l" ? 0.105 : 0.895)} ${fy(0.5)}" fill="none" stroke="url(#gold)" stroke-width="12"/>
        <ellipse cx="${fx(sd === "l" ? 0.105 : 0.895)}" cy="${fy(0.51)}" rx="12" ry="18" fill="url(#gold)" stroke="${INK}" stroke-width="2"/>`;
    }
  }

  // Floor.
  s += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="url(#floor)"/><rect y="${floorY}" width="${W}" height="10" fill="#000" opacity="0.35"/>`;
  for (let i = -8; i <= 8; i++) s += `<line x1="${W / 2 + i * 110}" y1="${floorY}" x2="${W / 2 + i * 300}" y2="${H}" stroke="#000" stroke-opacity="0.22" stroke-width="3"/>`;
  for (let i = 1; i < 4; i++) s += `<line x1="0" y1="${floorY + i * i * 22}" x2="${W}" y2="${floorY + i * i * 22}" stroke="#000" stroke-opacity="0.18" stroke-width="3"/>`;
  for (let i = 0; i < 90; i++) {
    const t = rand();
    const y = floorY + 20 + t * (H - floorY - 30);
    const spread = 90 + t * 520;
    const x = W / 2 + (rand() - 0.5) * 2 * spread * (0.4 + rand() * 0.6);
    s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(7 + t * 8).toFixed(1)}" ry="${(3.5 + t * 4).toFixed(1)}" fill="${rand() > 0.35 ? "#f97316" : "#fbbf24"}" opacity="${(0.55 + rand() * 0.4).toFixed(2)}" transform="rotate(${(rand() * 180).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }

  // Wall shelves (items stand on them).
  for (const sh of shelves) {
    const x0 = fx(sh.x - 0.07), x1 = fx(sh.x + 0.07), y = fy(sh.y);
    s += `<rect x="${x0}" y="${y + 20}" width="${x1 - x0}" height="40" fill="#000" opacity="0.4" filter="url(#shadow)"/>`;
    s += `<path d="M${x0 + 22} ${y + 18} L${x0 + 22} ${y + 74} L${x0 + 74} ${y + 18} Z M${x1 - 22} ${y + 18} L${x1 - 22} ${y + 74} L${x1 - 74} ${y + 18} Z" fill="url(#wood)" stroke="${INK}" stroke-width="4"/>`;
    s += `<rect x="${x0}" y="${y - 4}" width="${x1 - x0}" height="26" rx="5" fill="url(#wood)" stroke="${INK}" stroke-width="4"/><rect x="${x0}" y="${y - 4}" width="${x1 - x0}" height="9" rx="4" fill="#fff" opacity="0.22"/>`;
    s += garland([x0 + 10, y + 22], [(x0 + x1) / 2, y + 44], [x1 - 10, y + 22], 6, { size: 0.5, small: true });
  }

  // Altar tiers.
  tiers.forEach((tier, i) => {
    const cloth = CL[(i + clothShift) % CL.length];
    const x0 = fx(tier.left), x1 = fx(tier.right), y0 = fy(tier.top);
    const y1 = i + 1 < tiers.length ? fy(tiers[i + 1].top) : floorY;
    const h = y1 - y0;
    const id = `cl${i}`;
    defs += `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cloth.a}"/><stop offset="1" stop-color="${cloth.b}"/></linearGradient>`;
    s += `<rect x="${x0 - 14}" y="${y1 - 6}" width="${x1 - x0 + 28}" height="46" fill="#000" opacity="0.45" filter="url(#shadow)"/>`;
    s += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${h}" fill="url(#${id})" stroke="${INK}" stroke-width="5"/>`;
    s += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${h}" fill="url(#folds)" opacity="0.5"/>`;
    const bandY = y0 + h * 0.34, bandH = Math.min(46, h * 0.34);
    s += `<rect x="${x0}" y="${bandY - 8}" width="${x1 - x0}" height="4" fill="${cloth.trim}" opacity="0.4"/>`;
    s += `<rect x="${x0 + 4}" y="${bandY}" width="${x1 - x0 - 8}" height="${bandH}" fill="url(#${PATTERN_IDS[(i + patternShift) % PATTERN_IDS.length]})" opacity="0.38"/>`;
    s += `<rect x="${x0}" y="${bandY + bandH + 5}" width="${x1 - x0}" height="4" fill="${cloth.trim}" opacity="0.4"/>`;
    for (let x = x0 + 8; x < x1 - 4; x += 14) s += `<line x1="${x}" y1="${y1 - 4}" x2="${x}" y2="${y1 + 12}" stroke="${cloth.trim}" stroke-width="4" stroke-linecap="round"/>`;
    s += `<rect x="${x0 - 6}" y="${y0 - 24}" width="${x1 - x0 + 12}" height="30" rx="6" fill="${cloth.a}" stroke="${INK}" stroke-width="4"/><rect x="${x0 - 6}" y="${y0 - 24}" width="${x1 - x0 + 12}" height="12" rx="6" fill="#fff" opacity="0.28"/>`;
    s += garland([x0 + 20, y0 + 20], [(x0 + x1) / 2, y0 + 72], [x1 - 20, y0 + 20], Math.max(3, Math.round((x1 - x0) / 120)), { size: 0.55, small: true });
  });

  if (side !== "pillar") {
    s += garland([fx(0.02), 0], [fx(0.1), fy(0.2)], [fx(0.14), fy(0.42)], 9, { size: 0.9 });
    s += garland([fx(0.98), 0], [fx(0.9), fy(0.2)], [fx(0.86), fy(0.42)], 9, { size: 0.9 });
  }

  // Papel picado banners.
  s += flagString([0, fy(0.012)], [W / 2, fy(0.06)], [W, fy(0.012)], 21, rand, { w: 72, h: 92 });
  if (flagRows > 1) s += flagString([0, fy(0.095)], [W / 2, fy(0.13)], [W, fy(0.095)], 23, rand, { w: 56, h: 66 });

  for (let i = 0; i < 30; i++) {
    const x = rand() * W, y = rand() * floorY, r = 2 + rand() * 4;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#fff7d6" opacity="${(0.2 + rand() * 0.5).toFixed(2)}"/>`;
  }

  s += finish();
  return svgWrap(s, defs);
}
