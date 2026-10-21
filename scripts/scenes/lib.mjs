// Helpers shared by the scene generators: seeded random, scene-fraction coordinates, flowers, flags, garlands.

export const W = 2048;
export const H = 1280;
export const fx = (v) => +(v * W).toFixed(1);
export const fy = (v) => +(v * H).toFixed(1);

// Small deterministic random (mulberry32) so a scene always renders the same.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const INK = "#1e1040"; // thin outline colour used across the art

export const PICADO = ["#ec4899", "#fb923c", "#2dd4bf", "#a78bfa", "#fbbf24", "#38bdf8"];

// Point and tangent angle on a quadratic bezier.
export function quad(p0, p1, p2, t) {
  const u = 1 - t;
  const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
  const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
  const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
  const dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

// Reusable defs: marigold flower, papel picado cut-outs, fabric folds, soft glow, grain.
export function commonDefs() {
  const petals = (n, rx, ry, dist, fill, rot = 0) =>
    Array.from({ length: n }, (_, k) => `<ellipse cx="0" cy="${-dist}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="#b45309" stroke-width="1.2" transform="rotate(${(k * 360) / n + rot})"/>`).join("");
  return `
  <g id="marigold">
    ${petals(14, 9, 17, 15, "#f97316")}
    ${petals(12, 8, 14, 11, "#fb923c", 15)}
    ${petals(9, 6.5, 10, 7, "#fbbf24", 8)}
    <circle r="5" fill="#b45309"/><circle r="2.5" fill="#78350f"/>
  </g>
  <g id="marigold-small">
    ${petals(10, 7, 12, 11, "#fb923c")}
    ${petals(8, 5.5, 8, 6, "#fbbf24", 20)}
    <circle r="3.4" fill="#b45309"/>
  </g>
  <mask id="cut" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x="0" y="0" width="1" height="1">
    <rect width="1" height="1" fill="#fff"/>
    <polygon points="0.5,0.2 0.66,0.36 0.5,0.52 0.34,0.36" fill="#000"/>
    <circle cx="0.5" cy="0.36" r="0.05" fill="#fff"/>
    <circle cx="0.2" cy="0.18" r="0.05" fill="#000"/><circle cx="0.8" cy="0.18" r="0.05" fill="#000"/>
    <circle cx="0.2" cy="0.55" r="0.045" fill="#000"/><circle cx="0.8" cy="0.55" r="0.045" fill="#000"/>
    <polygon points="0.2,0.7 0.28,0.8 0.2,0.9 0.12,0.8" fill="#000"/><polygon points="0.5,0.66 0.58,0.76 0.5,0.86 0.42,0.76" fill="#000"/><polygon points="0.8,0.7 0.88,0.8 0.8,0.9 0.72,0.8" fill="#000"/>
  </mask>
  <linearGradient id="folds" x1="0" x2="86" y1="0" y2="0" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
    <stop offset="0" stop-color="#000" stop-opacity="0.38"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.10"/>
    <stop offset="0.6" stop-color="#000" stop-opacity="0.18"/><stop offset="1" stop-color="#000" stop-opacity="0.38"/>
  </linearGradient>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="soft-sm" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.9 -0.35"/>
  </filter>`;
}

// A string of papel picado flags hanging on a sagging line.
export function flagString(p0, p1, p2, count, rand, { w = 84, h = 108 } = {}) {
  let out = `<path d="M${p0} Q${p1} ${p2}" fill="none" stroke="${INK}" stroke-width="3.5"/>`;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const { x, y, angle } = quad(p0, p1, p2, t);
    const colour = PICADO[(i + Math.floor(rand() * 3)) % PICADO.length];
    const path = `M${-w / 2} 0 H${w / 2} V${h} L${w / 2 - w / 6} ${h - 14} L${w / 6} ${h} L0 ${h - 14} L${-w / 6} ${h} L${-w / 2 + w / 6} ${h - 14} L${-w / 2} ${h} Z`;
    out += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(angle * 0.35).toFixed(1)})">
      <path d="${path}" fill="${colour}" mask="url(#cut)" stroke="${INK}" stroke-width="2.2" stroke-opacity="0.55" transform="translate(0 4)"/>
      <path d="${path}" fill="#fff" fill-opacity="0.12" mask="url(#cut)" transform="scale(0.96 0.5) translate(0 4)"/>
    </g>`;
  }
  return out;
}

// Marigold garland along a quadratic curve.
export function garland(p0, p1, p2, count, { size = 1, small = false } = {}) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const { x, y } = quad(p0, p1, p2, i / (count - 1));
    out += `<use href="#${small ? "marigold-small" : "marigold"}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${size}) rotate(${(i * 47) % 360})"/>`;
  }
  return out;
}

export function svgWrap(inner, defs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${commonDefs()}${defs}</defs>${inner}</svg>`;
}

// Soft vignette and film grain on top of everything, to glue the layers together.
export function finish() {
  return `
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.10" style="mix-blend-mode:overlay"/>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>`;
}

export function vignetteDef(strength = 0.55) {
  return `<radialGradient id="vig" cx="50%" cy="48%" r="75%"><stop offset="55%" stop-color="#0a0320" stop-opacity="0"/><stop offset="100%" stop-color="#0a0320" stop-opacity="${strength}"/></radialGradient>`;
}
