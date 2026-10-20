"use server";

// Play loop server actions (spec sections 3, 4 and 9). The describing phone is the only one that ever gets
// the target, the building phone only gets the tray, and scores are computed here from stored data.
// Timer transitions can be asked for by either phone; the server checks its own clock and moves the room
// with a conditional update, so two phones asking at once still move it only once.

import { afterReveal, countdownEndsAt, EARLY_MS, parsePlacement, playClosesAt, type TrayEntry } from "@/lib/game/flow";
import { fail } from "@/lib/game/room";
import { rolesForPlay } from "@/lib/game/roles";
import type { PlacedItem } from "@/lib/game/scoring";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Phase, PlayerRow, RoomRow } from "@/lib/supabase/types";
import { endPlay, getPlacement, getTarget, savePlacementRow, trayFor, writeResults } from "./playData";
import { authenticate, getRoom, guard, must, parseCredentials, type Credentials, type Db } from "./shared";

export type PlayView =
  | { play: number; role: "describer"; targets: { itemId: string; x: number; y: number; scale: number }[] }
  | { play: number; role: "builder"; tray: TrayEntry[]; placed: PlacedItem[] };

function parsePlayIdx(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 100 ? value : null;
}

// Token, room and phone in one go. Null when any of them is wrong.
async function load(db: Db, creds: Credentials): Promise<{ room: RoomRow; me: PlayerRow } | null> {
  const me = await authenticate(db, creds);
  if (!me) return null;
  const room = await getRoom(db, creds.pin);
  return room ? { room, me } : null;
}

// What this phone needs to play the current play: the target (describing phone) or the tray (building phone).
export async function getPlayView(input: Credentials) {
  return guard<{ view: PlayView }>(async () => {
    const creds = parseCredentials(input);
    if (!creds) return fail("invalid_request");
    const db = supabaseAdmin();
    const ctx = await load(db, creds);
    if (!ctx) return fail("not_in_room");
    const { room, me } = ctx;
    if (room.phase !== "countdown" && room.phase !== "playing") return fail("play_over");

    const target = await getTarget(db, room.pin, room.current_play);
    if (!target) return fail("not_ready"); // Start is still writing the plays
    const roles = rolesForPlay(room.current_play);
    if (me.team === roles.describerTeam) {
      const targets = target.targets.map(({ itemId, x, y, scale }) => ({ itemId, x, y, scale }));
      return { ok: true, view: { play: room.current_play, role: "describer", targets } };
    }
    const placement = await getPlacement(db, room.pin, room.current_play);
    return { ok: true, view: { play: room.current_play, role: "builder", tray: trayFor(target), placed: placement?.items ?? [] } };
  });
}

// Autosave every few seconds, on Finish and at time-out (spec section 9). Finish ends the play for both phones.
export async function savePlacement(input: Credentials & { play: number; items: PlacedItem[]; finish?: boolean }) {
  return guard<{ ended: boolean }>(async () => {
    const creds = parseCredentials(input);
    if (!creds) return fail("invalid_request");
    const raw = input as unknown as Record<string, unknown>;
    const play = parsePlayIdx(raw.play);
    if (play === null) return fail("invalid_request");
    const finish = raw.finish === true;

    const db = supabaseAdmin();
    const ctx = await load(db, creds);
    if (!ctx) return fail("not_in_room");
    const { room, me } = ctx;
    if (room.phase !== "playing" || room.current_play !== play || !room.play_started_at) return fail("play_over");
    if (me.team !== rolesForPlay(play).builderTeam) return fail("not_allowed");
    if (Date.now() > playClosesAt(room.play_started_at, room.settings)) return fail("play_over");

    const target = await getTarget(db, room.pin, play);
    if (!target) return fail("not_ready");
    const items = parsePlacement(raw.items, trayFor(target));
    if (!items) return fail("invalid_request");

    await savePlacementRow(db, room.pin, play, me.id, items, finish);
    const ended = finish ? await endPlay(db, room) : false;
    return { ok: true, ended };
  });
}

// Either phone asks when its clock says a timer ran out. The server decides with its own clock.
export async function advanceTimer(input: Credentials & { phase: Phase; play: number }) {
  return guard<{ changed: boolean }>(async () => {
    const creds = parseCredentials(input);
    if (!creds) return fail("invalid_request");
    const raw = input as unknown as Record<string, unknown>;
    const play = parsePlayIdx(raw.play);
    if (play === null) return fail("invalid_request");

    const db = supabaseAdmin();
    const ctx = await load(db, creds);
    if (!ctx) return fail("not_in_room");
    const { room } = ctx;
    // The phone saw an older state: nothing to do, its next snapshot will catch up.
    if (room.phase !== raw.phase || room.current_play !== play) return { ok: true, changed: false };
    const now = Date.now();

    if (room.phase === "countdown") {
      const endsAt = countdownEndsAt(room.phase_started_at);
      if (now < endsAt - EARLY_MS) return { ok: true, changed: false };
      const startedAt = new Date(endsAt).toISOString();
      const moved = must(
        await db
          .from("rooms")
          .update({ phase: "playing", phase_started_at: startedAt, play_started_at: startedAt })
          .eq("pin", room.pin)
          .eq("phase", "countdown")
          .eq("current_play", play)
          .select("pin"),
      ) as unknown[];
      return { ok: true, changed: moved.length > 0 };
    }

    if (room.phase === "playing") {
      if (!room.play_started_at || now < playClosesAt(room.play_started_at, room.settings) - EARLY_MS) {
        return { ok: true, changed: false };
      }
      return { ok: true, changed: await endPlay(db, room) };
    }

    if (room.phase === "reveal") {
      await writeResults(db, room, play); // no-op when the results are already there
      return { ok: true, changed: false };
    }

    return { ok: true, changed: false };
  });
}

// Host only: from the reveal to the next play, or to the end of the game after the last one.
export async function nextPlay(input: Credentials & { play: number }) {
  return guard<{ finished: boolean }>(async () => {
    const creds = parseCredentials(input);
    if (!creds) return fail("invalid_request");
    const play = parsePlayIdx((input as unknown as Record<string, unknown>).play);
    if (play === null) return fail("invalid_request");

    const db = supabaseAdmin();
    const ctx = await load(db, creds);
    if (!ctx) return fail("not_in_room");
    const { room, me } = ctx;
    if (room.host_id !== me.id) return fail("not_host");
    if (room.phase !== "reveal" || room.current_play !== play) return fail("play_over");

    await writeResults(db, room, play); // the next screen must never miss this play's score
    const next = afterReveal(play, room.settings);
    const now = new Date().toISOString();
    const patch =
      next.phase === "countdown"
        ? { phase: "countdown", current_play: next.play, phase_started_at: now, play_started_at: null }
        : { phase: "finished", status: "finished", phase_started_at: now };
    const moved = must(
      await db.from("rooms").update(patch).eq("pin", room.pin).eq("phase", "reveal").eq("current_play", play).select("pin"),
    ) as unknown[];
    if (moved.length === 0) return fail("play_over"); // double tap: the first one already moved on
    return { ok: true, finished: next.phase === "finished" };
  });
}
