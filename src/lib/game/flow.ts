// Play loop timing and data rules (spec sections 3, 4 and 8). Pure: the server actions in
// src/app/actions/play.ts and the play screens both use these, so phones and server agree.

import { GAME, PLAY } from "./config";
import type { LayoutTarget } from "./layout";
import { shuffle, type Rng } from "./rng";
import type { PlacedItem } from "./scoring";

export interface TimedSettings {
  time_minutes: number;
  rounds: number;
}

// 3-2-1, then the 2-second role banner.
export const COUNTDOWN_MS = (GAME.countdownSeconds + GAME.roleBannerSeconds) * 1000;
export const FINISH_GRACE_MS = PLAY.finishGraceSeconds * 1000;
export const EARLY_MS = PLAY.earlySeconds * 1000;

export function totalPlays(settings: Pick<TimedSettings, "rounds">): number {
  return settings.rounds * 2;
}

export function playDurationMs(settings: Pick<TimedSettings, "time_minutes">): number {
  return settings.time_minutes * 60_000;
}

const ms = (time: string | number) => (typeof time === "number" ? time : Date.parse(time));

// The play starts exactly when the countdown ends, not when a phone noticed it, so both phones agree.
export function countdownEndsAt(phaseStartedAt: string | number): number {
  return ms(phaseStartedAt) + COUNTDOWN_MS;
}

export function playEndsAt(playStartedAt: string | number, settings: Pick<TimedSettings, "time_minutes">): number {
  return ms(playStartedAt) + playDurationMs(settings);
}

// After the timer: the building phone's last save is still accepted for a few seconds, then either phone ends the play.
export function playClosesAt(playStartedAt: string | number, settings: Pick<TimedSettings, "time_minutes">): number {
  return playEndsAt(playStartedAt, settings) + FINISH_GRACE_MS;
}

export type AfterReveal = { phase: "countdown"; play: number } | { phase: "finished" };

export function afterReveal(currentPlay: number, settings: Pick<TimedSettings, "rounds">): AfterReveal {
  return currentPlay + 1 < totalPlays(settings) ? { phase: "countdown", play: currentPlay + 1 } : { phase: "finished" };
}

export interface TrayEntry {
  itemId: string;
  count: number; // copies the builder can place (decoys: 1)
}

// What the building phone gets: item types with counts, decoys mixed in, no positions. Decoys look like any
// other entry, so the tray does not say which items are in the target.
export function buildTray(targets: readonly Pick<LayoutTarget, "itemId">[], decoys: readonly string[], rng: Rng): TrayEntry[] {
  const counts = new Map<string, number>();
  for (const t of targets) counts.set(t.itemId, (counts.get(t.itemId) ?? 0) + 1);
  for (const d of decoys) if (!counts.has(d)) counts.set(d, 1);
  return shuffle(
    rng,
    [...counts].map(([itemId, count]) => ({ itemId, count })),
  );
}

// Untrusted placement from the building phone: only tray items, never more copies than the tray holds,
// coordinates clamped into the scene. Null when the payload is not even a list of items.
export function parsePlacement(raw: unknown, tray: readonly TrayEntry[]): PlacedItem[] | null {
  if (!Array.isArray(raw) || raw.length > PLAY.maxPlacedItems) return null;
  const left = new Map(tray.map((t) => [t.itemId, t.count]));
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const out: PlacedItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) return null;
    const { itemId, x, y } = entry as Record<string, unknown>;
    if (typeof itemId !== "string" || typeof x !== "number" || typeof y !== "number") return null;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const remaining = left.get(itemId) ?? 0;
    if (remaining <= 0) continue; // unknown item or one copy too many: ignored, not an error
    left.set(itemId, remaining - 1);
    out.push({ itemId, x: clamp(x), y: clamp(y) });
  }
  return out;
}
