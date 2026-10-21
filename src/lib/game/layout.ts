// Layout generator (spec section 6). Pure and seeded: the same inputs always give the same target.

import { CATALOG } from "@/data/items";
import { DIFFICULTY, LAYOUT, type Difficulty } from "./config";
import { createRng, pick, shuffle, type Rng } from "./rng";
import { sceneDistance } from "./scoring";
import type { Background, ItemDef, Scene, SceneCatalog, Slot } from "./types";

export interface LayoutTarget {
  itemId: string;
  slotId: string;
  x: number;
  y: number;
  scale: number;
}

export interface Layout {
  seed: string;
  backgroundId: string;
  targets: LayoutTarget[];
  decoys: string[]; // item ids of the decoys in the tray
}

export class LayoutError extends Error {}

// Round 1 altar, round 2 house, round 3 altar, round 4 house. Each round has two plays.
export function sceneForPlay(playIdx: number): Scene {
  return Math.floor(playIdx / 2) % 2 === 0 ? "altar" : "house";
}

function maxCopies(item: ItemDef): number {
  return item.maxCopies ?? LAYOUT.defaultMaxCopies;
}

// Distinct types first; extra copies only when the level needs more items than there are types.
function chooseItems(rng: Rng, items: readonly ItemDef[], count: number): ItemDef[] {
  const order = shuffle(rng, items);
  if (count <= order.length) return order.slice(0, count);
  const chosen = [...order];
  const copies = new Map(order.map((i) => [i.id, 1]));
  while (chosen.length < count) {
    const candidates = order.filter((i) => (copies.get(i.id) ?? 0) < maxCopies(i));
    if (candidates.length === 0) throw new LayoutError(`Not enough item copies for ${count} items`);
    const item = pick(rng, candidates);
    copies.set(item.id, (copies.get(item.id) ?? 0) + 1);
    chosen.push(item);
  }
  return chosen;
}

function tryPlace(rng: Rng, background: Background, items: ItemDef[]): LayoutTarget[] | null {
  const slotsFor = (item: ItemDef) => background.slots.filter((s) => item.slotTypes.includes(s.type));
  // Most constrained items first, so a floor-only witch is not starved by a flexible candle.
  const ordered = items
    .map((item, i) => ({ item, i, options: slotsFor(item).length }))
    .sort((a, b) => a.options - b.options || a.i - b.i);

  const used: Slot[] = [];
  const targets: LayoutTarget[] = [];
  for (const { item } of ordered) {
    const free = slotsFor(item).filter(
      (s) => !used.includes(s) && used.every((u) => sceneDistance(u, s) >= LAYOUT.minSlotDistance),
    );
    if (free.length === 0) return null;
    const slot = pick(rng, free);
    used.push(slot);
    targets.push({ itemId: item.id, slotId: slot.id, x: slot.x, y: slot.y, scale: slot.scale });
  }
  return targets;
}

export function generateLayout(
  background: Background,
  difficulty: Difficulty,
  seed: string,
  catalog: SceneCatalog = CATALOG[background.scene],
): Layout {
  const level = DIFFICULTY[difficulty];
  if (catalog.decoys.length < level.decoys) {
    throw new LayoutError(`Scene ${background.scene} has ${catalog.decoys.length} decoys, level needs ${level.decoys}`);
  }

  // Fixed seed progression: attempt n uses "<seed>#n", so every caller re-rolls the same way.
  for (let attempt = 0; attempt < LAYOUT.maxAttempts; attempt++) {
    const rng = createRng(`${seed}#${attempt}`);
    const items = chooseItems(rng, catalog.items, level.items);
    const targets = tryPlace(rng, background, items);
    if (!targets) continue;
    const decoys = shuffle(rng, catalog.decoys)
      .slice(0, level.decoys)
      .map((d) => d.id);
    return { seed, backgroundId: background.id, targets, decoys };
  }
  throw new LayoutError(
    `No valid layout for ${background.id} on ${difficulty} after ${LAYOUT.maxAttempts} attempts (seed ${seed})`,
  );
}

export interface PlannedPlay {
  playIdx: number;
  scene: Scene;
  backgroundId: string;
}

// Background per play: least used first, never the same background twice in a row for a scene when another exists.
// Slot files still marked "placeholder" (no real image yet) are skipped as soon as the scene has a real one.
export function planBackgrounds(totalPlays: number, seed: string, backgrounds: readonly Background[]): PlannedPlay[] {
  const rng = createRng(`${seed}#backgrounds`);
  const uses = new Map<string, number>(backgrounds.map((b) => [b.id, 0]));
  const last = new Map<Scene, string>();
  const plan: PlannedPlay[] = [];

  for (let playIdx = 0; playIdx < totalPlays; playIdx++) {
    const scene = sceneForPlay(playIdx);
    const inScene = backgrounds.filter((b) => b.scene === scene);
    const ready = inScene.filter((b) => !b.placeholder);
    const all = ready.length > 0 ? ready : inScene;
    if (all.length === 0) throw new LayoutError(`No backgrounds for scene ${scene}`);
    const notLast = all.length > 1 ? all.filter((b) => b.id !== last.get(scene)) : all;
    const fewest = Math.min(...notLast.map((b) => uses.get(b.id) ?? 0));
    const bg = pick(rng, notLast.filter((b) => (uses.get(b.id) ?? 0) === fewest));
    uses.set(bg.id, (uses.get(bg.id) ?? 0) + 1);
    last.set(scene, bg.id);
    plan.push({ playIdx, scene, backgroundId: bg.id });
  }
  return plan;
}
