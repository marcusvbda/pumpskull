"use server";

// Lobby server actions (spec sections 2, 3 and 9). Every write to the room goes through here with the
// service-role client; the browser only reads. Anyone can POST to these, so each action validates its
// input and checks the phone's token (and host rights) itself. A room holds one phone per team; each
// phone is one row in players.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { GAME } from "@/lib/game/config";
import {
  DEFAULT_SETTINGS,
  canStart,
  fail,
  freeTeam,
  nextHost,
  parsePin,
  parseSettings,
  randomPin,
  type ActionResult,
} from "@/lib/game/room";
import type { Team } from "@/lib/game/types";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { PlayerRow, RoomRow, RoomSettings } from "@/lib/supabase/types";

type Db = ReturnType<typeof supabaseAdmin>;

interface Credentials {
  pin: string;
  playerId: string;
  token: string;
}

const UNIQUE_VIOLATION = "23505";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- helpers (not exported: a "use server" file may only export actions) ----------

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === UNIQUE_VIOLATION;
}

async function guard<T extends object>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch (error) {
    console.error("[room action]", error);
    return fail("server");
  }
}

function parseCredentials(input: unknown): Credentials | null {
  if (typeof input !== "object" || input === null) return null;
  const { pin, playerId, token } = input as Record<string, unknown>;
  const validPin = parsePin(pin);
  if (!validPin || typeof playerId !== "string" || !UUID.test(playerId)) return null;
  if (typeof token !== "string" || token.length < 16 || token.length > 200) return null;
  return { pin: validPin, playerId, token };
}

const digest = (text: string) => createHash("sha256").update(text).digest();

async function tokenMatches(db: Db, playerId: string, token: string): Promise<boolean> {
  const row = must(await db.from("player_tokens").select("token").eq("player_id", playerId).maybeSingle()) as {
    token: string;
  } | null;
  return row !== null && timingSafeEqual(digest(row.token), digest(token));
}

async function getPlayers(db: Db, pin: string): Promise<PlayerRow[]> {
  return must(await db.from("players").select("*").eq("room_pin", pin).order("joined_at")) as PlayerRow[];
}

async function getRoom(db: Db, pin: string): Promise<RoomRow | null> {
  return must(await db.from("rooms").select("*").eq("pin", pin).maybeSingle()) as RoomRow | null;
}

// Token ok + the phone really belongs to this room.
async function authenticate(db: Db, creds: Credentials): Promise<PlayerRow | null> {
  if (!(await tokenMatches(db, creds.playerId, creds.token))) return null;
  const player = must(
    await db.from("players").select("*").eq("id", creds.playerId).eq("room_pin", creds.pin).maybeSingle(),
  ) as PlayerRow | null;
  return player;
}

// Creates the phone's player row and its private token row. Returns null when that team already has a
// phone (the players_room_team_uq index), which also covers two phones joining at the same moment.
async function addPhone(db: Db, pin: string, team: Team): Promise<{ player: PlayerRow; token: string } | null> {
  const inserted = await db.from("players").insert({ room_pin: pin, team }).select().single();
  if (isUniqueViolation(inserted.error)) return null;
  const player = must(inserted) as PlayerRow;
  const token = randomBytes(24).toString("base64url");
  const stored = await db.from("player_tokens").insert({ player_id: player.id, token });
  if (stored.error) {
    await db.from("players").delete().eq("id", player.id);
    throw new Error(stored.error.message);
  }
  return { player, token };
}

// ---------- actions ----------

export async function createRoom() {
  return guard<{ pin: string; playerId: string; token: string; team: Team }>(async () => {
    const db = supabaseAdmin();

    // Rooms live 24 h (spec section 9). Sweeping here keeps old PINs free even without a scheduled job.
    const cutoff = new Date(Date.now() - GAME.roomMaxAgeHours * 3600_000).toISOString();
    await db.from("rooms").delete().lt("created_at", cutoff);

    let pin: string | null = null;
    for (let attempt = 0; attempt < GAME.pinAttempts && pin === null; attempt++) {
      const candidate = randomPin(Math.random);
      const res = await db.from("rooms").insert({ pin: candidate, settings: DEFAULT_SETTINGS });
      if (!res.error) pin = candidate;
      else if (!isUniqueViolation(res.error)) throw new Error(res.error.message);
    }
    if (pin === null) return fail("no_pin");

    try {
      const team = freeTeam([])!; // empty room: Team Marigold
      const added = await addPhone(db, pin, team);
      if (!added) throw new Error("team clash in an empty room");
      must(await db.from("rooms").update({ host_id: added.player.id }).eq("pin", pin));
      return { ok: true, pin, playerId: added.player.id, token: added.token, team };
    } catch (error) {
      await db.from("rooms").delete().eq("pin", pin); // do not leave a room without a host behind
      throw error;
    }
  });
}

export async function joinRoom(input: { pin: string }) {
  return guard<{ pin: string; playerId: string; token: string; team: Team }>(async () => {
    const raw = (input ?? {}) as Record<string, unknown>;
    const pin = parsePin(raw.pin);
    if (!pin) return fail("invalid_pin");

    const db = supabaseAdmin();
    const room = await getRoom(db, pin);
    if (!room) return fail("unknown_pin");
    if (room.status !== "lobby") return fail("game_started");

    const team = freeTeam(await getPlayers(db, pin));
    if (team === null) return fail("room_full");
    // Two phones can pass the check above at the same moment; the unique index lets only one of them in.
    const added = await addPhone(db, pin, team);
    if (!added) return fail("room_full");
    return { ok: true, pin, playerId: added.player.id, token: added.token, team };
  });
}

export async function updateSettings(input: Credentials & { settings: Partial<RoomSettings> }) {
  return guard<{ settings: RoomSettings }>(async () => {
    const creds = parseCredentials(input);
    if (!creds) return fail("invalid_request");
    const patch = parseSettings((input as unknown as Record<string, unknown>).settings);
    if (!patch) return fail("invalid_settings");

    const db = supabaseAdmin();
    const player = await authenticate(db, creds);
    if (!player) return fail("not_in_room");
    const room = await getRoom(db, creds.pin);
    if (!room) return fail("unknown_pin");
    if (room.host_id !== player.id) return fail("not_host");
    if (room.status !== "lobby") return fail("game_started");

    const settings = { ...DEFAULT_SETTINGS, ...room.settings, ...patch };
    must(await db.from("rooms").update({ settings }).eq("pin", creds.pin));
    return { ok: true, settings };
  });
}

export async function startGame(input: Credentials) {
  return guard<object>(async () => {
    const creds = parseCredentials(input);
    if (!creds) return fail("invalid_request");

    const db = supabaseAdmin();
    const player = await authenticate(db, creds);
    if (!player) return fail("not_in_room");
    const room = await getRoom(db, creds.pin);
    if (!room) return fail("unknown_pin");
    if (room.host_id !== player.id) return fail("not_host");
    if (room.status !== "lobby") return fail("game_started");

    if (!canStart(await getPlayers(db, creds.pin))) return fail("need_phones");

    // Conditional on status = lobby, so a double tap on Start cannot start twice.
    const started = must(
      await db
        .from("rooms")
        .update({ status: "playing", phase: "countdown", phase_started_at: new Date().toISOString(), current_play: 0 })
        .eq("pin", creds.pin)
        .eq("status", "lobby")
        .select("pin"),
    ) as { pin: string }[];
    if (started.length === 0) return fail("game_started");
    return { ok: true };
  });
}

export async function leaveRoom(input: Credentials) {
  return guard<{ roomClosed: boolean }>(async () => {
    const creds = parseCredentials(input);
    if (!creds) return fail("invalid_request");

    const db = supabaseAdmin();
    const player = await authenticate(db, creds);
    if (!player) return fail("not_in_room");

    const heir = nextHost(await getPlayers(db, creds.pin), player.id);
    if (heir === null) {
      await db.from("rooms").delete().eq("pin", creds.pin); // last one out: phones and tokens cascade
      return { ok: true, roomClosed: true };
    }

    const room = await getRoom(db, creds.pin);
    // Hand over before deleting, otherwise the foreign key would leave the room without a host for a moment.
    if (room?.host_id === player.id) must(await db.from("rooms").update({ host_id: heir }).eq("pin", creds.pin));
    must(await db.from("players").delete().eq("id", player.id));
    return { ok: true, roomClosed: false };
  });
}

export async function heartbeat(input: Credentials) {
  return guard<object>(async () => {
    const creds = parseCredentials(input);
    if (!creds) return fail("invalid_request");

    const db = supabaseAdmin();
    if (!(await tokenMatches(db, creds.playerId, creds.token))) return fail("not_in_room");
    const rows = must(
      await db
        .from("players")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", creds.playerId)
        .eq("room_pin", creds.pin)
        .select("id"),
    ) as { id: string }[];
    return rows.length === 1 ? { ok: true } : fail("not_in_room");
  });
}
