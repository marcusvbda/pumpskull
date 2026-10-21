// Halloween house front, drawn from the slots in src/data/slots/<id>.json: `deriveHouse` places the door, windows,
// wall and porch where the slots are, `renderHouse` paints them. `style` only changes the look.

import { INK, W, H, fx, fy, rng, svgWrap, finish, vignetteDef } from "./lib.mjs";

export function deriveHouse(slots) {
  const door = slots.filter((s) => s.type === "door");
  const windows = slots.filter((s) => s.type === "window").map((s) => s.x).sort((a, b) => a - b);
  const wallSlots = slots.filter((s) => s.type === "wall");
  const floor = slots.filter((s) => s.type === "floor").map((s) => s.x);
  const doorX = door[0].x;
  const xs = [doorX - 0.0875, doorX + 0.0875, ...windows.flatMap((x) => [x - 0.075, x + 0.075]), ...wallSlots.flatMap((s) => [s.x - 0.05, s.x + 0.05])];
  let x0 = Math.min(...xs) - 0.01, x1 = Math.max(...xs) + 0.01;
  // At least the width of the classic house, centred on what the slots need.
  if (x1 - x0 < 0.56) {
    const mid = (x0 + x1) / 2;
    x0 = mid - 0.28;
    x1 = mid + 0.28;
  }
  // A door near the middle gives a symmetric house.
  if (Math.abs(doorX - 0.5) < 0.03) {
    const half = Math.max(0.5 - x0, x1 - 0.5, 0.28);
    x0 = 0.5 - half;
    x1 = 0.5 + half;
  }
  const tall = wallSlots.some((s) => s.y < 0.4); // items hang high: the wall starts higher
  return {
    body: { x0: Math.max(0.08, x0), x1: Math.min(0.92, x1), y0: tall ? 0.3 : 0.34, y1: 0.8 },
    doorX,
    windows,
    wallSlots,
    porch: { x0: Math.max(0.05, Math.min(...floor) - 0.07), x1: Math.min(0.95, Math.max(...floor) + 0.07) },
  };
}

export function renderHouse(cfg, seed = 1, style = {}) {
  const rand = rng(seed);
  const {
    wall = "#8b3fb5", wallDark = "#4c1d73", roof = "#3a2a6a", roofDark = "#1f1545", door = "#7a3b16", trim = "#e9d8ff",
    glow = "#ffd66b", moon = [0.82, 0.13], moonColour = "#fff6cf", moonGlow = "#ffe9a0",
    sky = ["#0f0a33", "#2a1260", "#6d2a7a", "#a14275"], hills = ["#241048", "#170a33"], grassTone = ["#1d4d3a", "#0d2a22"],
    chimney = "right", fence = false, tombs = false, lamp = false, shutters = true, bats = 3, cloudy = true,
  } = style;
  const b = { x0: fx(cfg.body.x0), x1: fx(cfg.body.x1), y0: fy(cfg.body.y0), y1: fy(cfg.body.y1) };
  const midX = (b.x0 + b.x1) / 2;
  const over = fx(0.055); // roof overhang
  const eaveY = b.y0;
  const apex = [midX, fy(0.05)];
  const porch = { x0: fx(cfg.porch.x0), x1: fx(cfg.porch.x1), y0: fy(0.8), y1: fy(0.97) };
  const atticR = fx(0.034);
  const atticY = eaveY - (eaveY - apex[1]) * 0.45;

  let defs = vignetteDef(0.65);
  defs += `
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="0.5" stop-color="${sky[1]}"/><stop offset="0.85" stop-color="${sky[2]}"/><stop offset="1" stop-color="${sky[3]}"/></linearGradient>
  <radialGradient id="moonglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${moonGlow}" stop-opacity="0.85"/><stop offset="0.4" stop-color="${moonGlow}" stop-opacity="0.25"/><stop offset="1" stop-color="${moonGlow}" stop-opacity="0"/></radialGradient>
  <linearGradient id="wallg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wall}"/><stop offset="1" stop-color="${wallDark}"/></linearGradient>
  <linearGradient id="roofg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${roof}"/><stop offset="1" stop-color="${roofDark}"/></linearGradient>
  <linearGradient id="doorg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${door}"/><stop offset="1" stop-color="#2a1208"/></linearGradient>
  <radialGradient id="win" cx="50%" cy="55%" r="65%"><stop offset="0" stop-color="#fff2b0"/><stop offset="0.55" stop-color="${glow}"/><stop offset="1" stop-color="#f59e0b"/></radialGradient>
  <radialGradient id="lampglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd66b" stop-opacity="0.7"/><stop offset="1" stop-color="#ffd66b" stop-opacity="0"/></radialGradient>
  <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${grassTone[0]}"/><stop offset="1" stop-color="${grassTone[1]}"/></linearGradient>
  <linearGradient id="deck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a5a2b"/><stop offset="1" stop-color="#5e3216"/></linearGradient>
  <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8c8ff" stop-opacity="0"/><stop offset="1" stop-color="#d8c8ff" stop-opacity="0.35"/></linearGradient>
  <pattern id="shingle" width="46" height="30" patternUnits="userSpaceOnUse"><path d="M0 28 Q23 36 46 28 M-23 13 Q0 21 23 13 Q46 21 69 13" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="3"/></pattern>
  <clipPath id="roofclip"><polygon points="${apex} ${b.x1 + over},${eaveY} ${b.x0 - over},${eaveY}"/></clipPath>`;

  let s = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  for (let i = 0; i < 90; i++) {
    const x = rand() * W, y = rand() * fy(0.5), r = 1 + rand() * 2.6;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#fff" opacity="${(0.25 + rand() * 0.6).toFixed(2)}"/>`;
  }
  const [mx, my] = [fx(moon[0]), fy(moon[1])];
  s += `<circle cx="${mx}" cy="${my}" r="230" fill="url(#moonglow)"/><circle cx="${mx}" cy="${my}" r="82" fill="${moonColour}"/><circle cx="${mx - 22}" cy="${my - 14}" r="14" fill="#000" opacity="0.08"/><circle cx="${mx + 24}" cy="${my + 22}" r="9" fill="#000" opacity="0.08"/><circle cx="${mx + 8}" cy="${my - 34}" r="7" fill="#000" opacity="0.08"/>`;
  if (cloudy) {
    for (const [cx, cy, sc] of [[0.66, 0.18, 1], [0.12, 0.26, 0.8], [0.9, 0.3, 0.7]]) {
      s += `<g transform="translate(${fx(cx)} ${fy(cy)}) scale(${sc})" fill="#3b2377" opacity="0.7" filter="url(#soft-sm)"><ellipse rx="150" ry="26"/><ellipse cx="-60" cy="-18" rx="80" ry="26"/><ellipse cx="50" cy="-22" rx="96" ry="30"/></g>`;
    }
  }
  const batSpots = [[0.28, 0.12, 1], [0.37, 0.2, 0.7], [0.62, 0.07, 0.6], [0.9, 0.34, 0.8]].slice(0, bats);
  for (const [bx, by, sc] of batSpots) {
    s += `<path transform="translate(${fx(bx)} ${fy(by)}) scale(${sc * 1.4})" d="M0 0 C-10 -14 -30 -14 -44 -2 C-34 -4 -26 2 -22 10 C-16 2 -8 4 0 12 C8 4 16 2 22 10 C26 2 34 -4 44 -2 C30 -14 10 -14 0 0Z" fill="#0b0524"/>`;
  }

  s += `<path d="M0 ${fy(0.7)} C ${fx(0.15)} ${fy(0.6)} ${fx(0.3)} ${fy(0.66)} ${fx(0.45)} ${fy(0.64)} S ${fx(0.8)} ${fy(0.58)} ${W} ${fy(0.66)} V ${fy(0.85)} H0 Z" fill="${hills[0]}"/>`;
  if (tombs) {
    for (const [tx, ty, sc] of [[0.12, 0.66, 1], [0.2, 0.69, 0.8], [0.86, 0.63, 1], [0.93, 0.66, 0.8]]) {
      s += `<path transform="translate(${fx(tx)} ${fy(ty)}) scale(${sc})" d="M-26 60 V0 Q-26 -30 0 -30 Q26 -30 26 0 V60 Z" fill="#150a2e"/><path transform="translate(${fx(tx)} ${fy(ty)}) scale(${sc})" d="M-4 -10 H4 M0 -16 V0" stroke="#3a2a66" stroke-width="5"/>`;
    }
  }
  s += `<path d="M0 ${fy(0.76)} C ${fx(0.2)} ${fy(0.7)} ${fx(0.4)} ${fy(0.74)} ${fx(0.6)} ${fy(0.72)} S ${fx(0.9)} ${fy(0.72)} ${W} ${fy(0.76)} V ${fy(0.9)} H0 Z" fill="${hills[1]}"/>`;

  const tree = (x, base, h, flip) => {
    const f = flip ? -1 : 1;
    return `<g transform="translate(${fx(x)} ${fy(base)}) scale(${f} 1)" stroke="#0a0420" stroke-linecap="round" fill="none">
      <path d="M0 0 C-6 ${-h * 0.4} 4 ${-h * 0.6} 0 ${-h}" stroke-width="22"/><path d="M-2 ${-h * 0.45} C-50 ${-h * 0.55} -80 ${-h * 0.7} -96 ${-h * 0.95}" stroke-width="12"/>
      <path d="M2 ${-h * 0.62} C50 ${-h * 0.72} 70 ${-h * 0.82} 90 ${-h * 1.02}" stroke-width="11"/><path d="M-60 ${-h * 0.62} C-90 ${-h * 0.66} -110 ${-h * 0.72} -128 ${-h * 0.8}" stroke-width="7"/>
      <path d="M0 ${-h * 0.8} C-24 ${-h * 0.9} -34 ${-h * 1.0} -30 ${-h * 1.12}" stroke-width="7"/></g>`;
  };
  // Trees stay outside the house, on the side with more room.
  const leftRoom = cfg.body.x0, rightRoom = 1 - cfg.body.x1;
  if (leftRoom > 0.12) s += tree(Math.min(0.08, leftRoom - 0.04), 0.84, 520, false);
  if (rightRoom > 0.12) s += tree(Math.max(0.92, 1 - (rightRoom - 0.04) + 0.0), 0.84, 560, true);

  s += `<rect y="${fy(0.78)}" width="${W}" height="${H - fy(0.78)}" fill="url(#grass)"/>`;
  for (let i = 0; i < 160; i++) {
    const x = rand() * W, y = fy(0.8) + rand() * (H - fy(0.8));
    s += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l-4 -16 M${x.toFixed(0)} ${y.toFixed(0)} l3 -18 M${x.toFixed(0)} ${y.toFixed(0)} l8 -12" stroke="#2f7a55" stroke-opacity="0.55" stroke-width="3" stroke-linecap="round"/>`;
  }
  s += `<rect y="${fy(0.62)}" width="${W}" height="${fy(0.2)}" fill="url(#fog)"/>`;

  // Iron fence along the sides of the garden.
  if (fence) {
    for (const [fa, fb] of [[0, Math.max(0, porch.x0 - 30)], [Math.min(W, porch.x1 + 30), W]]) {
      if (fb - fa < 60) continue;
      s += `<rect x="${fa}" y="${fy(0.84)}" width="${fb - fa}" height="9" fill="#0b0524"/><rect x="${fa}" y="${fy(0.9)}" width="${fb - fa}" height="9" fill="#0b0524"/>`;
      for (let x = fa + 10; x < fb; x += 44) s += `<path d="M${x} ${fy(0.93)} V${fy(0.82)} l-9 -16 l18 0 z" fill="#0b0524"/>`;
    }
  }
  // Street lamp.
  if (lamp) {
    const lx = leftRoom >= rightRoom ? fx(0.045) : fx(0.955);
    s += `<circle cx="${lx}" cy="${fy(0.46)}" r="170" fill="url(#lampglow)" opacity="0.7"/><rect x="${lx - 8}" y="${fy(0.5)}" width="16" height="${fy(0.84) - fy(0.5)}" fill="#0b0524"/><rect x="${lx - 22}" y="${fy(0.43)}" width="44" height="62" rx="8" fill="#ffd66b" stroke="#0b0524" stroke-width="6"/><path d="M${lx - 30} ${fy(0.43)} H${lx + 30} L${lx} ${fy(0.43) - 28} Z" fill="#0b0524"/>`;
  }

  // Chimney (behind the roof), roof, shingles.
  const cx = chimney === "right" ? midX + (b.x1 - b.x0) * 0.2 : midX - (b.x1 - b.x0) * 0.28;
  s += `<rect x="${cx}" y="${fy(0.08)}" width="${fx(0.07)}" height="${fy(0.16)}" fill="#3a2a55" stroke="${INK}" stroke-width="5"/><rect x="${cx - 8}" y="${fy(0.065)}" width="${fx(0.07) + 16}" height="${fy(0.03)}" fill="#4b3a6b" stroke="${INK}" stroke-width="5"/>`;
  s += `<polygon points="${apex} ${b.x1 + over},${eaveY + 6} ${b.x0 - over},${eaveY + 6}" fill="url(#roofg)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
  s += `<g clip-path="url(#roofclip)"><rect x="${b.x0 - over}" y="${apex[1]}" width="${b.x1 - b.x0 + over * 2}" height="${eaveY - apex[1]}" fill="url(#shingle)"/></g>`;
  s += `<line x1="${apex[0]}" y1="${apex[1]}" x2="${b.x1 + over}" y2="${eaveY + 6}" stroke="#fff" stroke-opacity="0.18" stroke-width="5"/><line x1="${b.x0 - over}" y1="${eaveY + 6}" x2="${b.x1 + over}" y2="${eaveY + 6}" stroke="${INK}" stroke-width="9"/>`;
  s += `<circle cx="${midX}" cy="${atticY}" r="${atticR}" fill="${trim}" stroke="${INK}" stroke-width="6"/><circle cx="${midX}" cy="${atticY}" r="${atticR - 7}" fill="url(#win)"/><path d="M${midX - atticR + 7} ${atticY} H${midX + atticR - 7} M${midX} ${atticY - atticR + 7} V${atticY + atticR - 7}" stroke="${INK}" stroke-width="5"/>`;

  // Facade.
  s += `<rect x="${b.x0}" y="${b.y0}" width="${b.x1 - b.x0}" height="${b.y1 - b.y0}" fill="url(#wallg)" stroke="${INK}" stroke-width="7"/>`;
  for (let y = b.y0 + 36; y < b.y1; y += 36) {
    s += `<line x1="${b.x0}" y1="${y}" x2="${b.x1}" y2="${y}" stroke="#000" stroke-opacity="0.28" stroke-width="3"/><line x1="${b.x0}" y1="${y + 3}" x2="${b.x1}" y2="${y + 3}" stroke="#fff" stroke-opacity="0.07" stroke-width="3"/>`;
  }
  s += `<rect x="${b.x0}" y="${b.y0}" width="18" height="${b.y1 - b.y0}" fill="${trim}" stroke="${INK}" stroke-width="4"/><rect x="${b.x1 - 18}" y="${b.y0}" width="18" height="${b.y1 - b.y0}" fill="${trim}" stroke="${INK}" stroke-width="4"/><rect x="${b.x0}" y="${b.y0}" width="${b.x1 - b.x0}" height="16" fill="${trim}" stroke="${INK}" stroke-width="4"/>`;

  // Windows at the window slots.
  for (const wx of cfg.windows) {
    const x0 = fx(wx - 0.053), x1 = fx(wx + 0.053), y0 = fy(0.416), y1 = fy(0.62);
    const mid = (x0 + x1) / 2, midY = (y0 + y1) / 2;
    s += `<circle cx="${mid}" cy="${midY}" r="230" fill="url(#lampglow)" opacity="0.5"/>`;
    if (shutters) {
      // Only on a side with room: nearest neighbour is another window or the door frame.
      const edges = [...cfg.windows.filter((o) => o !== wx).map((o) => [o - 0.053, o + 0.053]), [cfg.doorX - 0.0835, cfg.doorX + 0.0835]];
      const roomLeft = (wx - 0.053) - Math.max(cfg.body.x0, ...edges.filter(([, hi]) => hi <= wx).map(([, hi]) => hi));
      const roomRight = Math.min(cfg.body.x1, ...edges.filter(([lo]) => lo >= wx).map(([lo]) => lo)) - (wx + 0.053);
      const shutter = (x) => `<rect x="${x}" y="${y0 - 4}" width="40" height="${y1 - y0 + 8}" rx="4" fill="${roofDark}" stroke="${INK}" stroke-width="5"/>`;
      if (roomLeft > 0.045) s += shutter(x0 - 52);
      if (roomRight > 0.045) s += shutter(x1 + 12);
    }
    s += `<rect x="${x0 - 8}" y="${y0 - 8}" width="${x1 - x0 + 16}" height="${y1 - y0 + 16}" rx="10" fill="${trim}" stroke="${INK}" stroke-width="6"/><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="4" fill="url(#win)"/>
      <path d="M${mid} ${y0} V${y1} M${x0} ${midY} H${x1}" stroke="${INK}" stroke-width="7"/><path d="M${x0 + 10} ${y0 + 10} L${mid - 8} ${y0 + 10} L${x0 + 10} ${midY - 10} Z" fill="#fff" opacity="0.28"/>
      <rect x="${x0 - 22}" y="${y1 + 8}" width="${x1 - x0 + 44}" height="18" fill="${trim}" stroke="${INK}" stroke-width="5"/>`;
  }

  // Door at the door slots.
  const dx0 = fx(cfg.doorX - 0.0675), dx1 = fx(cfg.doorX + 0.0675), dy0 = fy(0.376), dy1 = b.y1, dmid = (dx0 + dx1) / 2;
  s += `<path d="M${dx0 - 16} ${dy1} V${dy0 + 70} Q${dmid} ${dy0 - 60} ${dx1 + 16} ${dy0 + 70} V${dy1} Z" fill="${trim}" stroke="${INK}" stroke-width="6"/>`;
  s += `<path d="M${dx0} ${dy1} V${dy0 + 70} Q${dmid} ${dy0 - 36} ${dx1} ${dy0 + 70} V${dy1} Z" fill="url(#doorg)" stroke="${INK}" stroke-width="6"/>`;
  s += `<rect x="${dx0 + 22}" y="${dy0 + 78}" width="${dx1 - dx0 - 44}" height="150" rx="14" fill="#000" opacity="0.22"/><rect x="${dx0 + 22}" y="${dy0 + 260}" width="${dx1 - dx0 - 44}" height="170" rx="14" fill="#000" opacity="0.22"/><line x1="${dmid}" y1="${dy0 + 12}" x2="${dmid}" y2="${dy1}" stroke="#000" stroke-opacity="0.25" stroke-width="4"/><circle cx="${dx1 - 34}" cy="${fy(0.6)}" r="12" fill="#fbbf24" stroke="${INK}" stroke-width="4"/>`;

  // Lanterns beside the door, only where no window or wall item sits.
  for (const side of [-1, 1]) {
    const lxn = cfg.doorX + side * 0.0855;
    const clash = cfg.windows.some((w) => Math.abs(w - lxn) < 0.125) || cfg.wallSlots.some((w) => w.y >= 0.36 && w.y <= 0.68 && Math.abs(w.x - lxn) < 0.085);
    if (clash || lxn < cfg.body.x0 + 0.03 || lxn > cfg.body.x1 - 0.03) continue;
    const lx = fx(lxn);
    s += `<circle cx="${lx}" cy="${fy(0.5)}" r="120" fill="url(#lampglow)"/><rect x="${lx - 14}" y="${fy(0.5) - 24}" width="28" height="48" rx="6" fill="#ffd66b" stroke="${INK}" stroke-width="5"/><rect x="${lx - 18}" y="${fy(0.5) - 32}" width="36" height="10" fill="${INK}"/><rect x="${lx - 18}" y="${fy(0.5) + 22}" width="36" height="10" fill="${INK}"/>`;
  }

  // Porch.
  s += `<rect x="${porch.x0}" y="${porch.y0}" width="${porch.x1 - porch.x0}" height="${porch.y1 - porch.y0}" fill="url(#deck)" stroke="${INK}" stroke-width="7"/>`;
  for (let i = 1; i < 6; i++) {
    const y = porch.y0 + ((porch.y1 - porch.y0) / 6) * i;
    s += `<line x1="${porch.x0}" y1="${y}" x2="${porch.x1}" y2="${y}" stroke="#000" stroke-opacity="${0.18 + i * 0.03}" stroke-width="3.5"/>`;
  }
  for (let x = porch.x0 + 90; x < porch.x1; x += 130) s += `<line x1="${x}" y1="${porch.y0}" x2="${x + (x - W / 2) * 0.05}" y2="${porch.y1}" stroke="#000" stroke-opacity="0.12" stroke-width="3"/>`;
  s += `<rect x="${porch.x0}" y="${porch.y0}" width="${porch.x1 - porch.x0}" height="14" fill="#000" opacity="0.28"/><rect x="${porch.x0 - 6}" y="${porch.y1 - 6}" width="${porch.x1 - porch.x0 + 12}" height="26" fill="#3f200c" stroke="${INK}" stroke-width="6"/>`;
  for (const px of [porch.x0 + 6, porch.x1 - 6]) {
    s += `<rect x="${px - 18}" y="${b.y1 - 150}" width="36" height="${porch.y0 - b.y1 + 160}" fill="${trim}" stroke="${INK}" stroke-width="5"/><rect x="${px - 26}" y="${b.y1 - 160}" width="52" height="16" fill="${trim}" stroke="${INK}" stroke-width="5"/>`;
  }

  s += `<ellipse cx="${fx(0.12)}" cy="${fy(0.9)}" rx="320" ry="40" fill="#cdbbff" opacity="0.10" filter="url(#soft)"/><ellipse cx="${fx(0.9)}" cy="${fy(0.93)}" rx="360" ry="44" fill="#cdbbff" opacity="0.10" filter="url(#soft)"/>`;
  s += finish();
  return svgWrap(s, defs);
}
