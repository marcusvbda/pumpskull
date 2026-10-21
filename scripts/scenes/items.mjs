// Item sprites (1024x1024, transparent). Items that stand on a surface rest on y = 1008 and are centred
// horizontally; wall items (`center` anchor) are centred on the canvas, matching src/data/items.ts.

import { INK, commonDefs } from "./lib.mjs";

const S = 1024;
const wrap = (inner, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs>${commonDefs()}
  <filter id="blur6" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="blur18" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>${defs}</defs>${inner}</svg>`;

const lg = (id, stops, x2 = 0, y2 = 1, x1 = 0, y1 = 0) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</linearGradient>`;
const rg = (id, stops, cx = 0.5, cy = 0.5, r = 0.5) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</radialGradient>`;
const ink = (w = 12) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const shine = (d, o = 0.35) => `<path d="${d}" fill="#fff" opacity="${o}"/>`;
const leaf = (x, y, rot, sz = 1, fill = "#22c55e") => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sz})"><path d="M0 0 C40 -30 90 -30 130 0 C90 30 40 30 0 0Z" fill="${fill}" ${ink(8)}/><path d="M8 0 H116" stroke="#14532d" stroke-width="5" stroke-linecap="round" opacity="0.6"/></g>`;

// ---------- Day of the Dead ----------

function marigoldVase() {
  const defs = lg("vase", [[0, "#7ff3df"], [0.55, "#14b8a6"], [1, "#0b5d57"]], 1, 0.2) + lg("vaseside", [[0, "#000", 0.28], [0.3, "#000", 0], [0.75, "#fff", 0.18], [1, "#000", 0.25]], 1, 0);
  const body = "M404 648 C404 700 300 760 292 850 C286 930 340 1008 400 1008 H624 C684 1008 738 930 732 850 C724 760 620 700 620 648 Z";
  let s = `<ellipse cx="512" cy="1004" rx="250" ry="14" fill="#000" opacity="0.2"/>`;
  s += leaf(430, 560, -150, 1.5) + leaf(594, 560, -30, 1.5) + leaf(400, 600, -200, 1.2, "#16a34a") + leaf(624, 600, 20, 1.2, "#16a34a");
  s += `<path d="M512 660 V420 M470 660 L380 420 M554 660 L644 420 M450 660 L330 540 M574 660 L694 540" stroke="#15803d" stroke-width="14" stroke-linecap="round"/>`;
  s += `<path d="${body}" fill="url(#vase)" ${ink(12)}/><path d="${body}" fill="url(#vaseside)"/>`;
  s += `<ellipse cx="512" cy="648" rx="112" ry="24" fill="#0b5d57" ${ink(10)}/><ellipse cx="512" cy="644" rx="100" ry="16" fill="#064e49"/>`;
  s += `<path d="M300 840 Q512 900 724 840 M294 884 Q512 944 730 884" fill="none" stroke="#fde68a" stroke-width="10" opacity="0.9"/>`;
  for (let i = 0; i < 6; i++) s += `<path transform="translate(${340 + i * 70} 868)" d="M0 -22 L24 0 L0 22 L-24 0Z" fill="#f472b6" ${ink(6)}/>`;
  s += shine("M336 800 C340 760 380 724 410 700 C390 740 360 780 352 830Z", 0.45);
  const flowers = [[512, 300, 2.9, 10], [384, 392, 2.6, 80], [640, 392, 2.6, 150], [320, 520, 2.3, 30], [704, 520, 2.3, 200], [452, 500, 2.5, 120], [572, 500, 2.5, 250], [512, 190, 1.9, 60]];
  for (const [x, y, sc, r] of flowers) s += `<use href="#marigold" transform="translate(${x} ${y}) scale(${sc}) rotate(${r})"/>`;
  return wrap(s, defs);
}

function candle() {
  const defs = lg("wax", [[0, "#fff8e6"], [0.5, "#fff3d1"], [1, "#e9d7a6"]], 1, 0) + lg("plate", [[0, "#fde68a"], [0.5, "#f59e0b"], [1, "#92400e"]])
    + rg("flameglow", [[0, "#ffd166", 0.9], [1, "#ffd166", 0]]) + lg("flame", [[0, "#fff7b0"], [0.4, "#ffc247"], [1, "#f97316"]]);
  let s = `<circle cx="512" cy="190" r="190" fill="url(#flameglow)"/>`;
  s += `<ellipse cx="512" cy="990" rx="250" ry="22" fill="#000" opacity="0.22"/>`;
  s += `<ellipse cx="512" cy="968" rx="240" ry="38" fill="url(#plate)" ${ink(10)}/><ellipse cx="512" cy="958" rx="190" ry="24" fill="#fcd34d" opacity="0.8"/>`;
  s += `<path d="M404 340 H620 V960 C620 975 404 975 404 960 Z" fill="url(#wax)" ${ink(12)}/>`;
  s += `<path d="M404 340 C404 318 620 318 620 340 C620 366 404 366 404 340Z" fill="#fff8e6" ${ink(10)}/>`;
  s += `<path d="M404 356 Q420 470 452 392 Q470 360 486 412 Q500 520 530 380 Q560 330 586 404 Q600 460 620 360 V340 H404Z" fill="#fff3d1" ${ink(8)}/>`;
  s += `<path d="M424 400 V920" stroke="#fff" stroke-width="22" stroke-linecap="round" opacity="0.5"/><path d="M596 360 V940" stroke="#c9b27a" stroke-width="14" stroke-linecap="round" opacity="0.4"/>`;
  s += `<path d="M512 336 V290" stroke="#3a2a1a" stroke-width="10" stroke-linecap="round"/>`;
  s += `<path d="M512 286 C440 230 460 150 512 70 C566 150 586 230 512 286Z" fill="url(#flame)" ${ink(10)}/><path d="M512 270 C480 236 490 190 512 148 C534 190 544 236 512 270Z" fill="#fffbd0"/>`;
  return wrap(s, defs);
}

function photo() {
  const defs = lg("gold", [[0, "#fde68a"], [0.45, "#f59e0b"], [1, "#92400e"]], 1, 1) + lg("sepia", [[0, "#e9d2a8"], [1, "#a47a4a"]]) + lg("wood", [[0, "#9a5a2b"], [1, "#4a2a12"]]);
  let s = `<ellipse cx="512" cy="1002" rx="230" ry="12" fill="#000" opacity="0.22"/>`;
  s += `<path d="M700 700 L790 1004 H690 L610 760Z" fill="url(#wood)" ${ink(10)}/>`;
  s += `<rect x="260" y="960" width="504" height="46" rx="10" fill="url(#wood)" ${ink(10)}/>`;
  s += `<path d="M330 760 L300 960 H724 L694 760Z" fill="url(#wood)" ${ink(10)}/>`;
  s += `<rect x="270" y="90" width="484" height="690" rx="26" fill="url(#gold)" ${ink(12)}/>`;
  s += `<rect x="304" y="124" width="416" height="622" rx="12" fill="#3a2410" ${ink(8)}/>`;
  s += `<rect x="322" y="142" width="380" height="586" rx="6" fill="url(#sepia)"/>`;
  s += `<circle cx="512" cy="360" r="104" fill="#5a3a22"/><path d="M512 470 C360 470 316 590 316 728 H708 C708 590 664 470 512 470Z" fill="#5a3a22"/>`;
  s += `<path d="M420 300 C430 240 500 220 560 240 C610 256 616 300 604 330 C560 290 470 280 420 300Z" fill="#2a1a0c"/>`;
  s += `<circle cx="512" cy="372" r="88" fill="#c79a6a"/><path d="M432 330 C440 270 520 250 590 286 C600 310 596 330 590 340 C560 300 480 296 432 330Z" fill="#2a1a0c"/>`;
  s += `<path d="M512 460 C440 460 400 520 392 600 H632 C624 520 584 460 512 460Z" fill="#1f1410" opacity="0.8"/>`;
  s += `<path d="M322 142 H540 L322 360Z" fill="#fff" opacity="0.14"/>`;
  s += `<path d="M660 90 L754 90 L754 184Z" fill="#111" ${ink(8)}/><path d="M640 90 L754 204 V160 L690 90Z" fill="#000" opacity="0.7"/>`;
  s += `<use href="#marigold-small" transform="translate(300 780) scale(2)"/><use href="#marigold-small" transform="translate(724 786) scale(1.9) rotate(30)"/><use href="#marigold-small" transform="translate(264 930) scale(1.6) rotate(70)"/>`;
  return wrap(s, defs);
}

function bread() {
  const defs = lg("crust", [[0, "#f5c070"], [0.5, "#d9923c"], [1, "#9a5a1e"]], 0, 1) + rg("crustlight", [[0, "#fff", 0.5], [1, "#fff", 0]], 0.38, 0.28, 0.55);
  const dome = "M64 960 C64 720 290 516 512 516 C734 516 960 720 960 960 Q960 1008 890 1008 H134 Q64 1008 64 960Z";
  let s = `<ellipse cx="512" cy="1004" rx="450" ry="14" fill="#000" opacity="0.2"/>`;
  s += `<path d="${dome}" fill="url(#crust)" ${ink(12)}/><path d="${dome}" fill="url(#crustlight)"/>`;
  // Bone-shaped strips radiating from the top.
  const bone = (rot) => `<g transform="translate(512 640) rotate(${rot})"><path d="M-30 -118 C-52 -138 -56 -176 -36 -190 C-26 -198 -10 -194 -2 -184 C8 -194 28 -198 38 -188 C58 -172 52 -138 32 -118 L36 150 C58 170 54 206 34 214 C24 220 8 216 0 206 C-8 216 -26 220 -36 210 C-56 194 -52 160 -32 148Z" fill="#f2b560" stroke="#8a4a14" stroke-width="8" stroke-linejoin="round"/><path d="M-12 -110 V140" stroke="#fff" stroke-width="10" opacity="0.35" stroke-linecap="round"/></g>`;
  s += bone(-62) + bone(62) + bone(-22) + bone(22);
  s += `<circle cx="512" cy="530" r="62" fill="#f2b560" stroke="#8a4a14" stroke-width="8"/><circle cx="494" cy="514" r="16" fill="#fff" opacity="0.5"/>`;
  for (let i = 0; i < 46; i++) {
    const a = (i * 137.5) % 360, r = 120 + ((i * 53) % 330);
    const x = 512 + Math.cos((a * Math.PI) / 180) * r * 1.05, y = 820 + Math.sin((a * Math.PI) / 180) * r * 0.32;
    if (y > 560 && y < 990) s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${4 + (i % 4)}" fill="#fff" opacity="0.8"/>`;
  }
  return wrap(s, defs);
}

function sugarSkull() {
  const defs = lg("bone", [[0, "#fffdf6"], [1, "#efe6d2"]], 1, 1) + rg("eyeg", [[0, "#1b1033"], [1, "#2d1b5a"]]);
  const head = "M512 84 C262 84 168 296 196 516 C206 604 258 668 290 696 V850 Q290 1004 400 1008 H624 Q734 1004 734 850 V696 C766 668 818 604 828 516 C856 296 762 84 512 84Z";
  const eye = (cx, a, b) => `
    <circle cx="${cx}" cy="500" r="132" fill="${a}" ${ink(10)}/>
    ${Array.from({ length: 12 }, (_, k) => `<ellipse cx="${cx}" cy="${500 - 118}" rx="22" ry="34" fill="${k % 2 ? b : "#fff"}" stroke="${INK}" stroke-width="5" transform="rotate(${k * 30} ${cx} 500)"/>`).join("")}
    <circle cx="${cx}" cy="500" r="92" fill="url(#eyeg)" ${ink(8)}/><circle cx="${cx}" cy="500" r="52" fill="none" stroke="${a}" stroke-width="12"/><circle cx="${cx}" cy="500" r="22" fill="${b}"/><circle cx="${cx - 26}" cy="474" r="12" fill="#fff" opacity="0.8"/>`;
  let s = `<path d="${head}" fill="url(#bone)" ${ink(14)}/>`;
  s += shine("M250 300 C262 200 340 130 430 110 C340 170 290 250 280 350Z", 0.6);
  s += eye(358, "#ec4899", "#fbbf24") + eye(666, "#14b8a6", "#f97316");
  s += `<path d="M512 596 C470 596 440 640 468 668 C486 686 512 676 512 676 C512 676 538 686 556 668 C584 640 554 596 512 596Z" fill="#1b1033" ${ink(8)}/>`;
  // Forehead flower and cheek swirls.
  s += `<g transform="translate(512 250)">${Array.from({ length: 8 }, (_, k) => `<ellipse cx="0" cy="-38" rx="18" ry="30" fill="${k % 2 ? "#fbbf24" : "#f97316"}" stroke="${INK}" stroke-width="5" transform="rotate(${k * 45})"/>`).join("")}<circle r="16" fill="#ec4899" ${ink(5)}/></g>`;
  s += `<path d="M300 600 C260 640 290 700 340 690 C370 684 372 650 346 646" fill="none" stroke="#ec4899" stroke-width="10" stroke-linecap="round"/><path d="M724 600 C764 640 734 700 684 690 C654 684 652 650 678 646" fill="none" stroke="#14b8a6" stroke-width="10" stroke-linecap="round"/>`;
  s += `<path d="M512 160 V210 M330 190 L360 230 M694 190 L664 230" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`;
  for (let i = 0; i < 9; i++) s += `<circle cx="${216 + i * 74}" cy="${i % 2 ? 150 : 140}" r="0" />`;
  // Teeth.
  s += `<path d="M330 760 Q512 820 694 760" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>`;
  for (let i = 0; i < 6; i++) s += `<path d="M${356 + i * 62} ${780 + (i === 0 || i === 5 ? -8 : 0)} V${904 - Math.abs(i - 2.5) * 12}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>`;
  s += `<path d="M330 880 Q512 920 694 880" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>`;
  for (const [x, y, c] of [[250, 700, "#f97316"], [774, 700, "#ec4899"], [256, 400, "#fbbf24"], [768, 400, "#2dd4bf"], [330, 120, "#a78bfa"], [694, 120, "#f97316"]]) s += `<circle cx="${x}" cy="${y}" r="16" fill="${c}" ${ink(5)}/>`;
  return wrap(s, defs);
}

function water() {
  const defs = lg("glass", [[0, "#fff", 0.35], [0.5, "#bfe3ff", 0.12], [1, "#fff", 0.3]], 1, 0) + lg("wat", [[0, "#7dd3fc"], [1, "#0284c7"]]);
  const outer = "M352 330 H672 L636 1008 H388 Z";
  let s = `<ellipse cx="512" cy="1004" rx="170" ry="12" fill="#000" opacity="0.2"/>`;
  s += `<clipPath id="gclip"><path d="${outer}"/></clipPath>`;
  s += `<path d="${outer}" fill="#e8f6ff" opacity="0.25"/>`;
  s += `<g clip-path="url(#gclip)"><rect x="340" y="520" width="340" height="500" fill="url(#wat)"/><ellipse cx="512" cy="520" rx="170" ry="26" fill="#bae6fd"/><ellipse cx="512" cy="520" rx="150" ry="16" fill="#38bdf8" opacity="0.7"/>
    ${[[470, 700, 10], [560, 820, 8], [500, 900, 12], [586, 640, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="0.6"/>`).join("")}</g>`;
  s += `<path d="${outer}" fill="url(#glass)" ${ink(12)}/>`;
  s += `<ellipse cx="512" cy="330" rx="160" ry="26" fill="#fff" opacity="0.35" ${ink(8)}/>`;
  s += `<path d="M404 380 L430 940" stroke="#fff" stroke-width="22" stroke-linecap="round" opacity="0.7"/><path d="M630 400 L610 880" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="0.5"/>`;
  s += `<path d="M388 960 H636 L630 1008 H394Z" fill="#7fc3ee" opacity="0.6"/>`;
  return wrap(s, defs);
}

function incense() {
  const defs = lg("clay", [[0, "#e07a4a"], [0.55, "#b4481e"], [1, "#6e260c"]], 1, 0.3) + rg("ember", [[0, "#fff3a0"], [0.5, "#ff8a2a"], [1, "#b91c1c"]]) + lg("smoke", [[0, "#fff", 0.0], [0.35, "#e9deff", 0.85], [1, "#cbb8ff", 0.95]], 0, 1);
  let s = `<ellipse cx="512" cy="1004" rx="250" ry="14" fill="#000" opacity="0.2"/>`;
  const smoke = (d, w, o = 1) => `<path d="${d}" fill="none" stroke="url(#smoke)" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;
  s += smoke("M512 730 C440 640 600 560 520 450 C450 360 580 280 520 150 C500 110 520 80 540 64", 40);
  s += smoke("M460 740 C400 680 500 620 450 540 C420 480 480 430 450 380", 26, 0.8);
  s += smoke("M566 740 C620 680 540 640 590 560 C620 500 570 460 596 410", 24, 0.7);
  // Legs, bowl, rim, glowing embers.
  s += `<path d="M360 880 L330 1008 H400 L420 900Z M664 880 L694 1008 H624 L604 900Z M486 900 V1008 H538 V900Z" fill="#7a2f10" ${ink(10)}/>`;
  const bowl = "M270 760 C270 900 380 940 512 940 C644 940 754 900 754 760Z";
  s += `<path d="${bowl}" fill="url(#clay)" ${ink(12)}/>`;
  s += `<path d="M284 820 Q512 880 740 820 M300 870 Q512 920 724 870" fill="none" stroke="#fbbf24" stroke-width="9" opacity="0.9"/>`;
  s += `<ellipse cx="512" cy="760" rx="244" ry="40" fill="#8a3414" ${ink(12)}/><ellipse cx="512" cy="760" rx="210" ry="28" fill="#3b1608"/>`;
  s += `<ellipse cx="512" cy="756" rx="180" ry="20" fill="url(#ember)"/>`;
  for (const [x, y] of [[430, 750], [520, 744], [590, 756], [470, 762]]) s += `<circle cx="${x}" cy="${y}" r="9" fill="#fff3a0"/>`;
  s += shine("M300 800 C320 850 350 890 390 910 C350 880 322 840 310 790Z", 0.3);
  return wrap(s, defs);
}

function fruit() {
  const defs = lg("bowl", [[0, "#c8632b"], [0.6, "#8f3c14"], [1, "#5a220a"]], 1, 0.2) + rg("orange", [[0, "#ffc060"], [0.7, "#f97316"], [1, "#c2410c"]], 0.38, 0.32, 0.7) + rg("apple", [[0, "#ff7a7a"], [0.7, "#dc2626"], [1, "#7f1d1d"]], 0.36, 0.3, 0.7) + rg("lemon", [[0, "#fff29a"], [0.7, "#facc15"], [1, "#b8860b"]], 0.38, 0.3, 0.7) + rg("grape", [[0, "#c9a0ff"], [0.7, "#7c3aed"], [1, "#3b1a7a"]], 0.35, 0.3, 0.7);
  let s = `<ellipse cx="512" cy="1004" rx="330" ry="14" fill="#000" opacity="0.2"/>`;
  s += `<path d="M420 960 H604 V1008 H420Z" fill="#7a3210" ${ink(10)}/>`;
  const ball = (x, y, r, g, extra = "") => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})" ${ink(10)}/><ellipse cx="${x - r * 0.35}" cy="${y - r * 0.38}" rx="${r * 0.3}" ry="${r * 0.18}" fill="#fff" opacity="0.5" transform="rotate(-30 ${x - r * 0.35} ${y - r * 0.38})"/>${extra}`;
  // Back row, then front row.
  s += ball(380, 540, 118, "orange") + ball(660, 548, 112, "orange");
  s += ball(512, 470, 126, "lemon");
  s += `<path d="M512 350 C510 320 520 296 540 282" stroke="#5a3a1a" stroke-width="12" fill="none" stroke-linecap="round"/>` + leaf(530, 300, -30, 0.9);
  s += ball(300, 650, 100, "apple") + ball(724, 654, 100, "orange");
  for (const [x, y] of [[560, 596], [610, 648], [520, 656], [584, 700], [470, 700], [540, 750], [620, 740], [500, 600]]) s += `<circle cx="${x}" cy="${y}" r="46" fill="url(#grape)" ${ink(8)}/><ellipse cx="${x - 14}" cy="${y - 16}" rx="12" ry="7" fill="#fff" opacity="0.5"/>`;
  s += `<path d="M560 540 C556 520 570 504 586 500" stroke="#3b6e2a" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  const bowl = "M150 700 H874 C874 880 740 960 512 960 C284 960 150 880 150 700Z";
  s += `<path d="${bowl}" fill="url(#bowl)" ${ink(12)}/>`;
  s += `<rect x="140" y="680" width="744" height="46" rx="22" fill="#a64a1a" ${ink(10)}/><rect x="150" y="684" width="724" height="14" rx="7" fill="#fff" opacity="0.2"/>`;
  s += `<path d="M190 790 Q512 860 834 790 M220 850 Q512 920 804 850" fill="none" stroke="#fbbf24" stroke-width="9" opacity="0.9"/>`;
  for (let i = 0; i < 9; i++) s += `<path transform="translate(${236 + i * 69} 822)" d="M0 -14 L16 0 L0 14 L-16 0Z" fill="#f472b6" ${ink(4)}/>`;
  return wrap(s, defs);
}

// ---------- Halloween ----------

function witch() {
  const defs = lg("hat", [[0, "#8b5cf6"], [1, "#3b1a7a"]], 1, 1) + lg("robe", [[0, "#3a2a6a"], [1, "#150e33"]], 1, 0) + lg("skin", [[0, "#b8f5a0"], [1, "#62c15a"]], 1, 1) + lg("straw", [[0, "#f4d27a"], [1, "#b8862a"]]);
  let s = `<ellipse cx="512" cy="1004" rx="290" ry="12" fill="#000" opacity="0.2"/>`;
  // Broom behind.
  s += `<path d="M770 280 L706 880" stroke="#8a5a2a" stroke-width="22" stroke-linecap="round"/><path d="M690 860 L640 1004 H790 L736 860Z" fill="url(#straw)" ${ink(10)}/><path d="M670 900 L690 1000 M705 880 L716 1000 M738 880 L744 1000" stroke="#8a5a1a" stroke-width="6"/><path d="M684 862 H744" stroke="#6a3a1a" stroke-width="16" stroke-linecap="round"/>`;
  // Robe.
  s += `<path d="M512 420 C420 430 360 560 330 720 C310 840 280 940 262 1004 H762 C744 940 714 840 694 720 C664 560 604 430 512 420Z" fill="url(#robe)" ${ink(12)}/>`;
  s += `<path d="M512 560 C500 700 470 860 440 1004 M512 560 C524 700 554 860 584 1004" stroke="#000" stroke-width="8" opacity="0.25" fill="none"/>`;
  for (const [x, y] of [[420, 760], [610, 820], [470, 900], [560, 700], [380, 900], [650, 940]]) s += `<path transform="translate(${x} ${y}) scale(0.8)" d="M0 -22 L6 -6 L22 -6 L9 4 L14 20 L0 10 L-14 20 L-9 4 L-22 -6 L-6 -6Z" fill="#fbbf24" opacity="0.9"/>`;
  s += `<path d="M334 960 Q512 990 700 960" fill="none" stroke="#a78bfa" stroke-width="10" opacity="0.8"/>`;
  // Arms and hand holding the broom.
  s += `<path d="M420 470 C360 540 360 620 410 660 C440 640 440 590 450 540Z" fill="#2a1d5a" ${ink(10)}/><path d="M604 470 C690 500 740 560 748 640 C720 660 690 640 676 600 C650 560 620 540 596 520Z" fill="#2a1d5a" ${ink(10)}/>`;
  s += `<circle cx="756" cy="660" r="32" fill="url(#skin)" ${ink(8)}/>`;
  // Head, hair, face.
  s += `<path d="M380 360 C330 420 350 520 400 540 C410 470 430 420 440 380Z M644 360 C694 420 674 520 624 540 C614 470 594 420 584 380Z" fill="#f97316" ${ink(8)}/>`;
  s += `<ellipse cx="512" cy="380" rx="122" ry="130" fill="url(#skin)" ${ink(12)}/>`;
  s += `<path d="M512 394 C480 416 486 454 520 450 C510 436 512 420 512 394Z" fill="#4fa84a" ${ink(8)}/>`;
  s += `<ellipse cx="458" cy="356" rx="22" ry="26" fill="#fff" ${ink(6)}/><ellipse cx="566" cy="356" rx="22" ry="26" fill="#fff" ${ink(6)}/><circle cx="462" cy="362" r="11" fill="#d90f53"/><circle cx="562" cy="362" r="11" fill="#d90f53"/><circle cx="465" cy="358" r="4" fill="#fff"/><circle cx="565" cy="358" r="4" fill="#fff"/>`;
  s += `<path d="M450 308 L488 328 M574 308 L536 328" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M458 462 Q512 496 570 460" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M490 474 l6 14 l8 -12 M530 474 l-6 14 l-8 -12" stroke="#fff" stroke-width="6" fill="none"/>`;
  s += shine("M430 300 C440 260 470 240 500 236 C470 262 452 290 446 320Z", 0.4);
  // Hat.
  s += `<path d="M512 20 C470 100 430 170 400 270 H624 C594 170 556 100 512 20Z" fill="url(#hat)" ${ink(12)}/>`;
  s += `<path d="M512 20 C540 70 560 100 560 100" stroke="#fff" opacity="0.2" stroke-width="14" fill="none"/>`;
  s += `<path d="M395 252 H629 L640 290 H384Z" fill="#fbbf24" ${ink(8)}/><rect x="480" y="248" width="64" height="46" rx="6" fill="none" stroke="${INK}" stroke-width="8"/><rect x="490" y="258" width="44" height="26" fill="#f59e0b"/>`;
  s += `<path d="M250 296 C250 262 420 240 512 240 C604 240 774 262 774 296 C774 330 604 316 512 316 C420 316 250 330 250 296Z" fill="url(#hat)" ${ink(12)}/><path d="M290 296 C330 310 420 316 512 316" fill="none" stroke="#c4b5fd" stroke-width="8" opacity="0.5"/>`;
  return wrap(s, defs);
}

function cauldron() {
  const defs = lg("iron", [[0, "#4a4a68"], [0.5, "#1b1b2e"], [1, "#07070f"]], 1, 0.4) + rg("brew", [[0, "#d9ff6a"], [0.6, "#7bd218"], [1, "#3f8a0a"]]) + rg("fire", [[0, "#fff3a0"], [0.5, "#ff9a2a"], [1, "#d3361c"]], 0.5, 0.8, 0.7);
  let s = `<ellipse cx="512" cy="1002" rx="360" ry="14" fill="#000" opacity="0.2"/>`;
  // Fire under the pot.
  const flame = (x, w, h) => `<path d="M${x - w} 1004 C${x - w} 940 ${x - w * 0.2} 940 ${x} ${1004 - h} C${x + w * 0.3} 940 ${x + w} 940 ${x + w} 1004Z" fill="url(#fire)" ${ink(8)}/>`;
  s += flame(300, 60, 130) + flame(724, 60, 130) + flame(512, 80, 160) + flame(410, 50, 100) + flame(620, 50, 100);
  s += `<path d="M330 860 L296 1004 H372 L388 900Z M694 860 L728 1004 H652 L636 900Z" fill="#14141f" ${ink(10)}/>`;
  const body = "M146 560 C120 700 180 880 330 920 C420 944 604 944 694 920 C844 880 904 700 878 560Z";
  s += `<path d="${body}" fill="url(#iron)" ${ink(14)}/>`;
  s += `<path d="M190 640 C180 740 214 830 280 876" stroke="#9aa0d0" stroke-width="22" stroke-linecap="round" fill="none" opacity="0.45"/>`;
  s += `<path d="M150 700 Q512 760 874 700 M170 780 Q512 850 854 780" fill="none" stroke="#000" stroke-width="8" opacity="0.35"/>`;
  s += `<circle cx="146" cy="640" r="40" fill="none" stroke="#14141f" stroke-width="16"/><circle cx="878" cy="640" r="40" fill="none" stroke="#14141f" stroke-width="16"/>`;
  s += `<ellipse cx="512" cy="560" rx="380" ry="76" fill="#1b1b2e" ${ink(14)}/><ellipse cx="512" cy="562" rx="344" ry="58" fill="url(#brew)"/>`;
  s += `<ellipse cx="400" cy="548" rx="110" ry="14" fill="#f0ff9a" opacity="0.6"/>`;
  for (const [x, y, r] of [[420, 520, 40], [560, 500, 52], [640, 540, 30], [500, 440, 34], [590, 380, 26], [440, 340, 20], [540, 280, 38], [610, 200, 18]]) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#b9f23a" opacity="0.92" ${ink(7)}/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.25}" fill="#fff" opacity="0.7"/>`;
  return wrap(s, defs);
}

function jackOLantern() {
  const defs = rg("pk", [[0, "#ffb347"], [0.6, "#f97316"], [1, "#b83e08"]], 0.4, 0.35, 0.8) + rg("glow", [[0, "#fff5a0"], [0.5, "#ffb21e"], [1, "#e85d04"]]);
  let s = `<ellipse cx="512" cy="1004" rx="400" ry="14" fill="#000" opacity="0.2"/>`;
  s += `<path d="M512 210 C300 190 70 320 70 600 C70 830 280 1004 512 1004 C744 1004 954 830 954 600 C954 320 724 190 512 210Z" fill="url(#pk)" ${ink(14)}/>`;
  s += `<path d="M512 214 C400 330 380 800 512 1000 C644 800 624 330 512 214Z" fill="#c2480a" opacity="0.35"/><path d="M300 240 C170 360 160 760 330 970 M724 240 C854 360 864 760 694 970" fill="none" stroke="#9a3a06" stroke-width="12" opacity="0.5"/>`;
  s += shine("M170 420 C190 330 260 260 350 232 C270 290 220 370 200 470Z", 0.4);
  s += `<path d="M512 214 C500 150 540 100 590 84" fill="none" stroke="#2f6b1a" stroke-width="46" stroke-linecap="round"/><path d="M512 214 C500 150 540 100 590 84" fill="none" stroke="#4fa32a" stroke-width="26" stroke-linecap="round"/><path d="M580 90 C640 60 660 120 620 140" fill="none" stroke="#22c55e" stroke-width="10" stroke-linecap="round"/>`;
  // Carved glowing face.
  const eyeL = "M222 470 L372 400 L384 560Z", eyeR = "M802 470 L652 400 L640 560Z";
  s += `<path d="${eyeL}" fill="url(#glow)" ${ink(10)}/><path d="${eyeR}" fill="url(#glow)" ${ink(10)}/>`;
  s += `<path d="M512 590 L458 676 H566Z" fill="url(#glow)" ${ink(10)}/>`;
  s += `<path d="M232 720 C300 880 420 920 512 920 C604 920 724 880 792 720 C730 770 680 740 640 790 C600 760 560 800 512 770 C464 800 424 760 384 790 C344 740 294 770 232 720Z" fill="url(#glow)" ${ink(10)}/>`;
  s += `<path d="M300 790 V840 M380 800 V860 M512 790 V850 M644 800 V860 M724 790 V840" stroke="${INK}" stroke-width="0"/>`;
  s += `<circle cx="300" cy="470" r="150" fill="#ffb21e" opacity="0.18" filter="url(#blur18)"/><circle cx="724" cy="470" r="150" fill="#ffb21e" opacity="0.18" filter="url(#blur18)"/>`;
  return wrap(s, defs);
}

function pumpkin() {
  const defs = rg("pk", [[0, "#ffb347"], [0.6, "#f97316"], [1, "#b83e08"]], 0.4, 0.35, 0.8);
  let s = `<ellipse cx="512" cy="1004" rx="400" ry="14" fill="#000" opacity="0.2"/>`;
  s += `<path d="M512 210 C300 190 70 320 70 600 C70 830 280 1004 512 1004 C744 1004 954 830 954 600 C954 320 724 190 512 210Z" fill="url(#pk)" ${ink(14)}/>`;
  s += `<path d="M512 214 C400 330 380 800 512 1000 C644 800 624 330 512 214Z" fill="#c2480a" opacity="0.4"/><path d="M300 240 C170 360 160 760 330 970 M724 240 C854 360 864 760 694 970" fill="none" stroke="#9a3a06" stroke-width="12" opacity="0.55"/>`;
  s += shine("M170 420 C190 330 260 260 350 232 C270 290 220 370 200 470Z", 0.45);
  s += `<path d="M512 214 C500 150 540 100 590 84" fill="none" stroke="#2f6b1a" stroke-width="46" stroke-linecap="round"/><path d="M512 214 C500 150 540 100 590 84" fill="none" stroke="#4fa32a" stroke-width="26" stroke-linecap="round"/>`;
  s += `<path d="M590 100 C660 60 700 130 650 160 C620 176 600 150 624 140" fill="none" stroke="#22c55e" stroke-width="12" stroke-linecap="round"/>` + leaf(480, 260, 200, 1.1);
  return wrap(s, defs);
}

function candyCorn() {
  const defs = lg("cc-w", [[0, "#fffdf2"], [1, "#efe6c8"]], 1, 0) + lg("cc-o", [[0, "#ffb347"], [1, "#e8741a"]], 1, 0) + lg("cc-y", [[0, "#ffe96a"], [1, "#f5c518"]], 1, 0);
  const outer = "M512 60 C470 60 420 160 360 360 C320 500 264 740 262 880 C260 980 330 1008 420 1008 H604 C694 1008 764 980 762 880 C760 740 704 500 664 360 C604 160 554 60 512 60Z";
  let s = `<ellipse cx="512" cy="1004" rx="260" ry="12" fill="#000" opacity="0.2"/>`;
  s += `<clipPath id="ccclip"><path d="${outer}"/></clipPath>`;
  s += `<g clip-path="url(#ccclip)"><rect x="200" y="0" width="624" height="330" fill="url(#cc-w)"/><rect x="200" y="330" width="624" height="330" fill="url(#cc-o)"/><rect x="200" y="660" width="624" height="360" fill="url(#cc-y)"/>
    <path d="M200 330 Q512 360 824 330 M200 660 Q512 690 824 660" fill="none" stroke="#000" stroke-width="6" opacity="0.18"/>
    <path d="M330 120 C300 360 240 700 250 940" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round" opacity="0.55"/></g>`;
  s += `<path d="${outer}" fill="none" ${ink(14)}/>`;
  return wrap(s, defs);
}

function ghostBody(withArms = true) {
  const defs = lg("gh", [[0, "#ffffff"], [0.6, "#f3effb"], [1, "#cbbfe8"]], 0, 1) + rg("ghglow", [[0, "#cdbbff", 0.5], [1, "#cdbbff", 0]]);
  const body = "M512 62 C340 62 232 190 232 380 V760 C232 800 250 860 260 880 C290 940 330 910 360 870 C390 830 420 850 440 890 C470 960 520 960 546 890 C566 850 600 830 628 870 C660 920 700 940 744 870 C770 830 792 800 792 760 V380 C792 190 684 62 512 62Z";
  let s = `<circle cx="512" cy="500" r="480" fill="url(#ghglow)"/>`;
  if (withArms) s += `<path d="M262 520 C170 540 120 600 130 660 C150 690 200 660 240 620Z M762 520 C854 540 904 600 894 660 C874 690 824 660 784 620Z" fill="url(#gh)" ${ink(12)}/>`;
  s += `<path d="${body}" fill="url(#gh)" ${ink(14)}/>`;
  s += `<path d="M300 800 C300 840 316 880 330 900 M720 800 C724 840 706 880 700 892" fill="none" stroke="#b6a6dd" stroke-width="10" stroke-linecap="round" opacity="0.7"/>`;
  s += shine("M290 230 C320 150 400 100 470 90 C400 140 350 210 330 300Z", 0.7);
  s += `<ellipse cx="410" cy="400" rx="52" ry="76" fill="#1b1033"/><ellipse cx="614" cy="400" rx="52" ry="76" fill="#1b1033"/><ellipse cx="392" cy="372" rx="16" ry="24" fill="#fff"/><ellipse cx="596" cy="372" rx="16" ry="24" fill="#fff"/>`;
  s += `<ellipse cx="344" cy="520" rx="44" ry="26" fill="#ff9ec0" opacity="0.7"/><ellipse cx="680" cy="520" rx="44" ry="26" fill="#ff9ec0" opacity="0.7"/>`;
  s += `<ellipse cx="512" cy="580" rx="46" ry="62" fill="#1b1033"/><ellipse cx="512" cy="606" rx="26" ry="28" fill="#e5487a"/>`;
  return wrap(s, defs);
}

function bat() {
  const defs = lg("bw", [[0, "#6a3fb8"], [1, "#2a1366"]], 0, 1) + lg("bwb", [[0, "#3a2080"], [1, "#150a3a"]], 0, 1);
  let s = `<ellipse cx="512" cy="512" rx="470" ry="260" fill="#8b5cf6" opacity="0.12" filter="url(#blur18)"/>`;
  const wing = (k) => `<g transform="translate(512 512) scale(${k} 1)">
    <path d="M60 -20 C150 -150 300 -190 440 -120 C410 -90 380 -70 380 -40 C350 -64 320 -56 296 -20 C268 -44 236 -30 214 8 C186 -16 150 -6 128 38 C110 10 84 4 60 40Z" fill="url(#bw)" ${ink(12)}/>
    <path d="M70 -10 L400 -112 M70 0 L296 -18 M70 12 L214 10" stroke="#150a3a" stroke-width="7" opacity="0.6" fill="none"/>
    <path d="M70 -14 C150 -120 250 -158 360 -126" fill="none" stroke="#a78bfa" stroke-width="8" opacity="0.5" stroke-linecap="round"/></g>`;
  s += wing(1) + wing(-1);
  s += `<path d="M452 420 L430 330 L496 382Z M572 420 L594 330 L528 382Z" fill="url(#bwb)" ${ink(10)}/><path d="M446 400 L440 352 L478 384Z M578 400 L584 352 L546 384Z" fill="#ff8fb8" opacity="0.7"/>`;
  s += `<ellipse cx="512" cy="540" rx="112" ry="150" fill="url(#bwb)" ${ink(12)}/><circle cx="512" cy="470" r="86" fill="url(#bwb)" ${ink(12)}/>`;
  s += `<circle cx="482" cy="462" r="20" fill="#ffd166" ${ink(6)}/><circle cx="542" cy="462" r="20" fill="#ffd166" ${ink(6)}/><circle cx="486" cy="464" r="8" fill="#1b1033"/><circle cx="538" cy="464" r="8" fill="#1b1033"/>`;
  s += `<path d="M490 510 Q512 530 534 510" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M498 512 l6 16 l7 -14 M526 512 l-6 16 l-7 -14" stroke="#fff" stroke-width="6" fill="none" stroke-linejoin="round"/>`;
  s += `<ellipse cx="512" cy="580" rx="62" ry="90" fill="#6a3fb8" opacity="0.35"/>`;
  return wrap(s, defs);
}

function batLights() {
  const defs = lg("bw", [[0, "#6a3fb8"], [1, "#2a1366"]], 0, 1) + rg("bulb", [[0, "#fff6b8"], [0.45, "#ffd23f"], [1, "#f59e0b"]]) + rg("bulbglow", [[0, "#ffd23f", 0.6], [1, "#ffd23f", 0]]);
  const p0 = [20, 300], p1 = [512, 470], p2 = [1004, 300];
  const at = (t) => {
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
  };
  let s = `<path d="M${p0} Q${p1} ${p2}" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>`;
  const bat = (x, y, sc) => `<g transform="translate(${x} ${y}) scale(${sc})">
    <path d="M0 0 C-30 -46 -90 -58 -140 -30 C-110 -26 -90 -10 -84 10 C-64 -6 -40 2 -26 28 C-18 14 -8 12 0 30 C8 12 18 14 26 28 C40 2 64 -6 84 10 C90 -10 110 -26 140 -30 C90 -58 30 -46 0 0Z" fill="url(#bw)" ${ink(8)}/>
    <ellipse cx="0" cy="22" rx="22" ry="30" fill="#2a1366" ${ink(6)}/><path d="M-14 -4 L-20 -30 L-2 -12Z M14 -4 L20 -30 L2 -12Z" fill="#2a1366" ${ink(5)}/><circle cx="-8" cy="12" r="4.5" fill="#ffd166"/><circle cx="8" cy="12" r="4.5" fill="#ffd166"/></g>`;
  for (const t of [0.16, 0.5, 0.84]) {
    const [x, y] = at(t);
    s += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 70}" stroke="${INK}" stroke-width="8"/>`;
    s += bat(x, y + 96, 1.15);
  }
  for (const t of [0.33, 0.67]) {
    const [x, y] = at(t);
    s += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 56}" stroke="${INK}" stroke-width="8"/><circle cx="${x}" cy="${y + 100}" r="84" fill="url(#bulbglow)"/><path d="M${x - 14} ${y + 52} H${x + 14} V${y + 66} H${x - 14}Z" fill="#6b4a1a" ${ink(5)}/><circle cx="${x}" cy="${y + 100}" r="36" fill="url(#bulb)" ${ink(8)}/><ellipse cx="${x - 12}" cy="${y + 88}" rx="9" ry="6" fill="#fff" opacity="0.7"/>`;
  }
  return wrap(s, defs);
}

function cobweb() {
  const cx = 512, cy = 512, R = 470, spokes = 10;
  const ang = (i) => (i * 2 * Math.PI) / spokes - Math.PI / 2;
  let s = "";
  const strand = (w, o) => `stroke="#f4f0ff" stroke-width="${w}" stroke-linecap="round" opacity="${o}" fill="none"`;
  const under = (w) => `stroke="${INK}" stroke-width="${w + 5}" stroke-linecap="round" opacity="0.45" fill="none"`;
  // Glow behind.
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#cdbbff" opacity="0.10" filter="url(#blur18)"/>`;
  for (let i = 0; i < spokes; i++) s += `<path d="M${cx} ${cy} L${cx + Math.cos(ang(i)) * R * (i % 3 === 0 ? 1 : 0.97)} ${cy + Math.sin(ang(i)) * R * (i % 3 === 0 ? 1 : 0.97)}" ${under(7)}/><path d="M${cx} ${cy} L${cx + Math.cos(ang(i)) * R * (i % 3 === 0 ? 1 : 0.97)} ${cy + Math.sin(ang(i)) * R * (i % 3 === 0 ? 1 : 0.97)}" ${strand(7, 0.95)}/>`;
  for (let ring = 1; ring <= 7; ring++) {
    const r = (R * ring) / 7.2;
    let d = "";
    for (let i = 0; i < spokes; i++) {
      const a0 = ang(i), a1 = ang(i + 1), am = (a0 + a1) / 2;
      const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r];
      const c = [cx + Math.cos(am) * r * 0.9, cy + Math.sin(am) * r * 0.9];
      d += `${i === 0 ? "M" : "L"}${p0[0].toFixed(1)} ${p0[1].toFixed(1)} Q${c[0].toFixed(1)} ${c[1].toFixed(1)} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} `;
    }
    s += `<path d="${d}" ${under(5)}/><path d="${d}" ${strand(5, 0.85)}/>`;
  }
  for (const [i, ring] of [[1, 4], [4, 6], [7, 3], [9, 5], [2, 2]]) {
    const r = (R * ring) / 7.2, a = ang(i);
    s += `<circle cx="${(cx + Math.cos(a) * r).toFixed(0)}" cy="${(cy + Math.sin(a) * r).toFixed(0)}" r="9" fill="#fff" opacity="0.9"/>`;
  }
  return wrap(s);
}

function spider() {
  const defs = lg("sp", [[0, "#4a3a6a"], [0.5, "#1c1236"], [1, "#07040f"]], 0.3, 1) + rg("eye", [[0, "#ffd0d0"], [0.5, "#ff2a4a"], [1, "#a0102a"]]);
  const body = [512, 560];
  let s = `<line x1="512" y1="110" x2="512" y2="${body[1] - 130}" stroke="#f1ecff" stroke-width="8" stroke-linecap="round" opacity="0.9"/>`;
  const leg = (sx, _dir, a, b, c) => `<path d="M${body[0] + sx * 70} ${body[1] - 10} L${body[0] + sx * a[0]} ${body[1] + a[1]} L${body[0] + sx * b[0]} ${body[1] + b[1]} L${body[0] + sx * c[0]} ${body[1] + c[1]}" fill="none" stroke="${INK}" stroke-width="30" stroke-linejoin="round" stroke-linecap="round"/><path d="M${body[0] + sx * 70} ${body[1] - 10} L${body[0] + sx * a[0]} ${body[1] + a[1]} L${body[0] + sx * b[0]} ${body[1] + b[1]} L${body[0] + sx * c[0]} ${body[1] + c[1]}" fill="none" stroke="#2c1d52" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>`;
  for (const sx of [-1, 1]) {
    s += leg(sx, 0, [170, -150], [300, -150], [360, -20]) + leg(sx, 0, [190, -70], [330, -60], [410, 80]) + leg(sx, 0, [190, 10], [320, 50], [380, 200]) + leg(sx, 0, [160, 80], [250, 150], [290, 290]);
  }
  s += `<ellipse cx="${body[0]}" cy="${body[1] + 40}" rx="150" ry="176" fill="url(#sp)" ${ink(14)}/>`;
  s += `<circle cx="${body[0]}" cy="${body[1] - 120}" r="82" fill="url(#sp)" ${ink(14)}/>`;
  s += `<path d="M${body[0]} ${body[1] + 10} l-34 -40 h68z M${body[0]} ${body[1] + 10} l-34 40 h68z" fill="#e5304f" ${ink(6)}/>`;
  for (const [x, y, r] of [[-30, -140, 20], [30, -140, 20], [-62, -112, 12], [62, -112, 12]]) s += `<circle cx="${body[0] + x}" cy="${body[1] + y}" r="${r}" fill="url(#eye)" ${ink(4)}/><circle cx="${body[0] + x - r * 0.3}" cy="${body[1] + y - r * 0.3}" r="${r * 0.28}" fill="#fff"/>`;
  s += shine(`M${body[0] - 100} ${body[1] - 20} C${body[0] - 110} ${body[1] - 80} ${body[0] - 70} ${body[1] - 120} ${body[0] - 30} ${body[1] - 130} C${body[0] - 70} ${body[1] - 90} ${body[0] - 90} ${body[1] - 50} ${body[0] - 90} ${body[1] - 10}Z`, 0.35);
  return wrap(s, defs);
}

export const ITEMS = {
  "altar/marigold-vase": marigoldVase,
  "altar/candle": candle,
  "altar/photo": photo,
  "altar/bread": bread,
  "altar/sugar-skull": sugarSkull,
  "altar/water": water,
  "altar/incense": incense,
  "altar/fruit": fruit,
  "house/witch": witch,
  "house/cauldron": cauldron,
  "house/jack-o-lantern": jackOLantern,
  "house/bat-lights": batLights,
  "house/cobweb": cobweb,
  "house/spider": spider,
  "house/candy-corn": candyCorn,
  "house/ghost": () => ghostBody(true),
  "decoys/pumpkin": pumpkin,
  "decoys/cobweb": cobweb,
  "decoys/bat": bat,
  "decoys/ghost": () => ghostBody(true),
};
