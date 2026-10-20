// Helpers shared by the server actions in this folder. Server only: it uses the service-role client.
// Not a "use server" file, so nothing here can be called from the browser.

import { createHash, timingSafeEqual } from "node:crypto";
import { fail, parsePin, type ActionResult } from "@/lib/game/room";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { PlayerRow, RoomRow } from "@/lib/supabase/types";

export type Db = ReturnType<typeof supabaseAdmin>;

export interface Credentials {
  pin: string;
  playerId: string;
  token: string;
}

const UNIQUE_VIOLATION = "23505";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === UNIQUE_VIOLATION;
}

export async function guard<T extends object>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch (error) {
    console.error("[server action]", error);
    return fail("server");
  }
}

export function parseCredentials(input: unknown): Credentials | null {
  if (typeof input !== "object" || input === null) return null;
  const { pin, playerId, token } = input as Record<string, unknown>;
  const validPin = parsePin(pin);
  if (!validPin || typeof playerId !== "string" || !UUID.test(playerId)) return null;
  if (typeof token !== "string" || token.length < 16 || token.length > 200) return null;
  return { pin: validPin, playerId, token };
}

const digest = (text: string) => createHash("sha256").update(text).digest();

export async function tokenMatches(db: Db, playerId: string, token: string): Promise<boolean> {
  const row = must(await db.from("player_tokens").select("token").eq("player_id", playerId).maybeSingle()) as {
    token: string;
  } | null;
  return row !== null && timingSafeEqual(digest(row.token), digest(token));
}

export async function getPlayers(db: Db, pin: string): Promise<PlayerRow[]> {
  return must(await db.from("players").select("*").eq("room_pin", pin).order("joined_at")) as PlayerRow[];
}

export async function getRoom(db: Db, pin: string): Promise<RoomRow | null> {
  return must(await db.from("rooms").select("*").eq("pin", pin).maybeSingle()) as RoomRow | null;
}

// Token ok + the phone really belongs to this room.
export async function authenticate(db: Db, creds: Credentials): Promise<PlayerRow | null> {
  if (!(await tokenMatches(db, creds.playerId, creds.token))) return null;
  const player = must(
    await db.from("players").select("*").eq("id", creds.playerId).eq("room_pin", creds.pin).maybeSingle(),
  ) as PlayerRow | null;
  return player;
}
