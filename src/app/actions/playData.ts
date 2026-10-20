// Play data on the server (spec sections 4, 6 and 9): creating the plays at Start, reading the private
// target, ending a play and scoring it. Server only, not a "use server" file.

import { randomBytes } from "node:crypto";
import { BACKGROUNDS, findBackground } from "@/data/backgrounds";
import { DIFFICULTY } from "@/lib/game/config";
import { buildTray, totalPlays, type TrayEntry } from "@/lib/game/flow";
import { generateLayout, planBackgrounds, type LayoutTarget } from "@/lib/game/layout";
import { rolesForPlay } from "@/lib/game/roles";
import { createRng } from "@/lib/game/rng";
import { scorePlacement, type PlacedItem } from "@/lib/game/scoring";
import type { PlayResultItem, PlayResultRow, RoomRow } from "@/lib/supabase/types";
import { isUniqueViolation, must, type Db } from "./shared";

// Private row: the seed and the target layout of one play.
interface PlayTargetRow {
  room_pin: string;
  play_idx: number;
  seed: string;
  targets: { item_id: string; slot_id: string; x: number; y: number; scale: number }[];
  decoys: string[];
}

export interface PlayTarget {
  seed: string;
  targets: LayoutTarget[];
  decoys: string[];
}

// Every play of the game is planned at Start: public rows (scene, background, describing team) and the
// private target layout. One random seed per room, so the layouts are reproducible from play_targets.
export async function createPlays(db: Db, room: RoomRow): Promise<void> {
  const seed = randomBytes(9).toString("base64url");
  const plan = planBackgrounds(totalPlays(room.settings), seed, BACKGROUNDS);
  const plays = [];
  const targets = [];
  for (const p of plan) {
    const layout = generateLayout(findBackground(p.backgroundId)!, room.settings.difficulty, `${seed}:${p.playIdx}`);
    plays.push({
      room_pin: room.pin,
      idx: p.playIdx,
      scene: p.scene,
      background_id: p.backgroundId,
      describer_team: rolesForPlay(p.playIdx).describerTeam,
    });
    targets.push({
      room_pin: room.pin,
      play_idx: p.playIdx,
      seed: layout.seed,
      targets: layout.targets.map((t) => ({ item_id: t.itemId, slot_id: t.slotId, x: t.x, y: t.y, scale: t.scale })),
      decoys: layout.decoys,
    });
  }
  // Targets first: a phone that sees the play row can ask for its target right away.
  must(await db.from("play_targets").insert(targets));
  must(await db.from("plays").insert(plays));
}

export async function deletePlays(db: Db, pin: string): Promise<void> {
  await db.from("plays").delete().eq("room_pin", pin);
  await db.from("play_targets").delete().eq("room_pin", pin);
}

export async function getTarget(db: Db, pin: string, playIdx: number): Promise<PlayTarget | null> {
  const row = must(
    await db.from("play_targets").select("*").eq("room_pin", pin).eq("play_idx", playIdx).maybeSingle(),
  ) as PlayTargetRow | null;
  if (!row) return null;
  return {
    seed: row.seed,
    targets: row.targets.map((t) => ({ itemId: t.item_id, slotId: t.slot_id, x: t.x, y: t.y, scale: t.scale })),
    decoys: row.decoys,
  };
}

// Same order on every call for a play, so a reload shows the tray as it was.
export function trayFor(target: PlayTarget): TrayEntry[] {
  return buildTray(target.targets, target.decoys, createRng(`${target.seed}#tray`));
}

export async function getPlacement(db: Db, pin: string, playIdx: number): Promise<{ items: PlacedItem[]; finished: boolean } | null> {
  const rows = must(
    await db.from("placements").select("*").eq("room_pin", pin).eq("play_idx", playIdx).order("updated_at", { ascending: false }),
  ) as { items: PlacedItem[]; finished: boolean }[];
  return rows[0] ?? null;
}

export async function savePlacementRow(db: Db, pin: string, playIdx: number, builderId: string, items: PlacedItem[], finished: boolean) {
  const row = { items, finished, updated_at: new Date().toISOString() };
  const updated = must(
    await db.from("placements").update(row).eq("room_pin", pin).eq("play_idx", playIdx).eq("builder_id", builderId).select("play_idx"),
  ) as unknown[];
  if (updated.length > 0) return;
  const inserted = await db.from("placements").insert({ room_pin: pin, play_idx: playIdx, builder_id: builderId, ...row });
  // Two saves crossing: the other one inserted first, so update over it.
  if (isUniqueViolation(inserted.error)) {
    must(await db.from("placements").update(row).eq("room_pin", pin).eq("play_idx", playIdx).eq("builder_id", builderId));
  } else must(inserted);
}

// Scores the play from the stored target and the last saved placement. Safe to call more than once: the
// first result wins, and the Spirit Meter is the sum of all results rather than an increment.
export async function writeResults(db: Db, room: RoomRow, playIdx: number): Promise<void> {
  const existing = must(
    await db.from("play_results").select("play_idx").eq("room_pin", room.pin).eq("play_idx", playIdx).maybeSingle(),
  );
  if (!existing) {
    const target = await getTarget(db, room.pin, playIdx);
    if (!target) throw new Error(`no target for ${room.pin} play ${playIdx}`);
    const placement = await getPlacement(db, room.pin, playIdx);
    const level = DIFFICULTY[room.settings.difficulty];
    const scored = scorePlacement(target.targets, placement?.items ?? [], { rFull: level.rFull, rZero: level.rZero });
    const items: PlayResultItem[] = scored.items.map((s, i) => ({
      item_id: s.itemId,
      target: s.target,
      scale: target.targets[i].scale,
      placed: s.placed,
      score: Math.round(s.score * 1000) / 1000,
    }));
    const total = Math.round(scored.total * 1000) / 1000;
    const inserted = await db
      .from("play_results")
      .insert({ room_pin: room.pin, play_idx: playIdx, results: { items, total }, spirit_gain: total });
    if (!isUniqueViolation(inserted.error)) must(inserted);
  }
  const all = must(await db.from("play_results").select("spirit_gain").eq("room_pin", room.pin)) as Pick<PlayResultRow, "spirit_gain">[];
  const meter = all.reduce((sum, r) => sum + Number(r.spirit_gain), 0);
  must(await db.from("rooms").update({ spirit_meter: Math.round(meter * 1000) / 1000 }).eq("pin", room.pin));
}

// playing -> reveal for the current play. Only the call that wins the conditional update scores it,
// but a reveal left without results (a crash in between) is scored again by advanceTimer.
export async function endPlay(db: Db, room: RoomRow): Promise<boolean> {
  const claimed = must(
    await db
      .from("rooms")
      .update({ phase: "reveal", phase_started_at: new Date().toISOString() })
      .eq("pin", room.pin)
      .eq("phase", "playing")
      .eq("current_play", room.current_play)
      .select("pin"),
  ) as unknown[];
  if (claimed.length === 0) return false;
  await writeResults(db, room, room.current_play);
  return true;
}
