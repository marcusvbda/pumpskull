// Placement scoring (spec section 4). Pure, runs on the server from stored targets and submitted placements.

import { REVEAL, SCENE_ASPECT } from "./config";

export interface Point {
  x: number; // 0..1, fraction of scene width
  y: number; // 0..1, fraction of scene height
}

export interface TargetItem extends Point {
  itemId: string;
}

export interface PlacedItem extends Point {
  itemId: string;
}

export interface ItemScore {
  itemId: string;
  target: Point;
  placed: Point | null;
  distance: number | null;
  score: number; // 0..1
}

export interface PlacementResult {
  items: ItemScore[]; // one entry per target, in target order
  total: number; // sum of item scores
}

export interface ScoringOptions {
  rFull: number;
  rZero: number;
  aspect?: number; // scene height / width, defaults to SCENE_ASPECT
}

// Distance in scene widths: d = sqrt(dx^2 + (dy * h/w)^2).
export function sceneDistance(a: Point, b: Point, aspect: number = SCENE_ASPECT): number {
  const dx = a.x - b.x;
  const dy = (a.y - b.y) * aspect;
  return Math.sqrt(dx * dx + dy * dy);
}

// 1 inside rFull, 0 beyond rZero, quadratic falloff (1 - t)^2 in between.
export function scoreForDistance(d: number, rFull: number, rZero: number): number {
  if (d <= rFull) return 1;
  if (d >= rZero) return 0;
  const t = (d - rFull) / (rZero - rFull);
  return (1 - t) * (1 - t);
}

export type RevealColour = "green" | "yellow" | "red";

export function revealColour(score: number): RevealColour {
  if (score >= REVEAL.green) return "green";
  if (score >= REVEAL.yellow) return "yellow";
  return "red";
}

// Bounds the matching work if a tampered client sends hundreds of copies.
const MAX_PLACED_PER_TYPE = 16;

// Client data is untrusted: drop anything that is not a finite point, clamp the rest into the scene.
function sanitize(placed: readonly PlacedItem[]): PlacedItem[] {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return placed
    .filter((p) => typeof p.itemId === "string" && Number.isFinite(p.x) && Number.isFinite(p.y))
    .map((p) => ({ itemId: p.itemId, x: clamp(p.x), y: clamp(p.y) }));
}

// Minimum total distance matching between targets and placed items of one type.
// Returns, for each target index, the index of the placed item matched to it, or -1.
// Bitmask DP over targets: types repeat at most a few times, so 2^targets stays tiny.
function matchSameType(targets: readonly Point[], placed: readonly Point[], aspect: number): number[] {
  const k = targets.length;
  const m = placed.length;
  const size = Math.min(k, m);
  const full = 1 << k;
  // cost[i][mask]: min distance using placed[i..] with `mask` targets already taken
  const memo = new Map<number, { cost: number; choice: number }>();

  const popcount = (n: number) => {
    let c = 0;
    while (n) {
      c += n & 1;
      n >>= 1;
    }
    return c;
  };

  const solve = (i: number, mask: number): number => {
    if (popcount(mask) === size) return 0;
    if (i === m) return Infinity;
    const key = i * full + mask;
    const hit = memo.get(key);
    if (hit) return hit.cost;
    let best = solve(i + 1, mask); // leave placed[i] unmatched
    let choice = -1;
    for (let t = 0; t < k; t++) {
      if (mask & (1 << t)) continue;
      const c = sceneDistance(placed[i], targets[t], aspect) + solve(i + 1, mask | (1 << t));
      if (c < best) {
        best = c;
        choice = t;
      }
    }
    memo.set(key, { cost: best, choice });
    return best;
  };

  solve(0, 0);
  const assignment = new Array<number>(k).fill(-1);
  let mask = 0;
  for (let i = 0; i < m && popcount(mask) < size; i++) {
    const choice = memo.get(i * full + mask)?.choice ?? -1;
    if (choice >= 0) {
      assignment[choice] = i;
      mask |= 1 << choice;
    }
  }
  return assignment;
}

export function scorePlacement(
  targets: readonly TargetItem[],
  placedRaw: readonly PlacedItem[],
  options: ScoringOptions,
): PlacementResult {
  const aspect = options.aspect ?? SCENE_ASPECT;
  const placed = sanitize(placedRaw);
  const items: ItemScore[] = targets.map((t) => ({
    itemId: t.itemId,
    target: { x: t.x, y: t.y },
    placed: null,
    distance: null,
    score: 0,
  }));

  const types = new Set(targets.map((t) => t.itemId));
  for (const type of types) {
    const targetIdx = targets.flatMap((t, i) => (t.itemId === type ? [i] : []));
    // More copies than targets can only come from a tampered client; extra copies are simply ignored by matching.
    const placedOfType = placed.filter((p) => p.itemId === type).slice(0, MAX_PLACED_PER_TYPE);
    const assignment = matchSameType(
      targetIdx.map((i) => targets[i]),
      placedOfType,
      aspect,
    );
    assignment.forEach((pi, local) => {
      if (pi < 0) return;
      const item = items[targetIdx[local]];
      const p = placedOfType[pi];
      const d = sceneDistance(p, item.target, aspect);
      item.placed = { x: p.x, y: p.y };
      item.distance = d;
      item.score = scoreForDistance(d, options.rFull, options.rZero);
    });
  }
  // Decoys and unknown items are never looked at: they score 0 and cost nothing.

  const total = items.reduce((sum, i) => sum + i.score, 0);
  return { items, total };
}
