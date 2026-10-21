// Slot files (spec section 6): checks and export used by the /dev/slots editor. Pure.

import { CATALOG } from "@/data/items";
import { DIFFICULTY, type Difficulty } from "./config";
import { generateLayout } from "./layout";
import type { Background, Slot, SlotType } from "./types";

export const SLOT_TYPES: readonly SlotType[] = ["step", "shelf", "floor", "wall", "door", "window"];
export const SLOT_COUNT = { min: 12, max: 16 } as const;
export const SLOT_SCALE = { min: 0.04, max: 0.25, default: 0.09 } as const;

// Wall items are centred on their slot, things that stand on a surface sit on it (see ItemDef.anchor).
export function slotAnchor(type: SlotType): "bottom" | "center" {
  return type === "wall" || type === "door" || type === "window" ? "center" : "bottom";
}

export function nextSlotId(slots: readonly Slot[]): string {
  const used = new Set(slots.map((s) => s.id));
  for (let n = 1; ; n++) {
    const id = `s${String(n).padStart(2, "0")}`;
    if (!used.has(id)) return id;
  }
}

const round = (v: number) => Math.round(v * 1000) / 1000;

export function clampSlot(slot: Slot): Slot {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return { ...slot, x: round(clamp(slot.x)), y: round(clamp(slot.y)), scale: round(Math.min(SLOT_SCALE.max, Math.max(SLOT_SCALE.min, slot.scale))) };
}

// What a person should fix before saving the file. Empty list = ready.
export function slotIssues(bg: Background): string[] {
  const issues: string[] = [];
  const n = bg.slots.length;
  if (n < SLOT_COUNT.min || n > SLOT_COUNT.max) issues.push(`${n} slots: use ${SLOT_COUNT.min} to ${SLOT_COUNT.max}.`);

  const seen = new Set<string>();
  for (const s of bg.slots) {
    if (seen.has(s.id)) issues.push(`Slot id ${s.id} is used twice.`);
    seen.add(s.id);
    if (!SLOT_TYPES.includes(s.type)) issues.push(`Slot ${s.id} has an unknown type.`);
    if (s.x < 0 || s.x > 1 || s.y < 0 || s.y > 1) issues.push(`Slot ${s.id} is outside the scene.`);
  }

  // Every item of the scene needs somewhere to go, or it can never be chosen.
  for (const item of CATALOG[bg.scene].items) {
    if (!bg.slots.some((s) => item.slotTypes.includes(s.type))) {
      issues.push(`No slot for ${item.name} (needs ${item.slotTypes.join(", ")}).`);
    }
  }

  // The real test: can the generator fill every level on this background?
  for (const level of Object.keys(DIFFICULTY) as Difficulty[]) {
    for (const seed of ["check-a", "check-b", "check-c"]) {
      try {
        generateLayout(bg, level, seed);
      } catch (error) {
        issues.push(`${DIFFICULTY[level].label}: ${(error as Error).message}`);
        break;
      }
    }
  }
  return issues;
}

// The file as it goes into src/data/slots/<id>.json.
export function exportBackground(bg: Background): string {
  const { id, scene, slots } = bg;
  return JSON.stringify({ id, scene, slots: slots.map(clampSlot) }, null, 2) + "\n";
}
