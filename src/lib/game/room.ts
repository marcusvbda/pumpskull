// Room rules that need no database (spec sections 3 and 9): input parsing, settings, PIN, the team of a new
// phone, Start, host handover. A room holds one phone per team.
// The server actions in src/app/actions/room.ts wrap these with Supabase reads and writes.

import { GAME, type Difficulty } from "./config";
import type { Rng } from "./rng";
import type { Team } from "./types";
import type { RoomSettings } from "@/lib/supabase/types";

export const ROOM_ERRORS = {
  invalid_pin: "The PIN has 4 digits.",
  unknown_pin: "We can't find that room. Check the PIN.",
  room_full: "This room is full: both team phones are already in.",
  game_started: "This game has already started.",
  invalid_settings: "Those settings are not allowed.",
  invalid_request: "Something is wrong with that request.",
  not_host: "Only the host can do that.",
  not_in_room: "You are not in this room.",
  need_phones: "Waiting for the other team's phone.",
  no_pin: "We could not create a room. Try again.",
  server: "Something went wrong. Try again.",
} as const;

export type RoomError = keyof typeof ROOM_ERRORS;

export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: RoomError; message: string };

export function fail(error: RoomError): { ok: false; error: RoomError; message: string } {
  return { ok: false, error, message: ROOM_ERRORS[error] };
}

export function parsePin(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}$/.test(value) ? value : null;
}

export function randomPin(rng: Rng): string {
  return String(Math.floor(rng() * 10000)).padStart(4, "0");
}

export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];

export const DEFAULT_SETTINGS: RoomSettings = {
  time_minutes: GAME.defaultTimeMinutes,
  difficulty: "easy",
  rounds: GAME.defaultRounds,
};

// Only the keys that were sent are checked and returned, so the host can change one setting at a time.
export function parseSettings(value: unknown): Partial<RoomSettings> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const out: Partial<RoomSettings> = {};
  if ("time_minutes" in input) {
    if (!(GAME.timeOptionsMinutes as readonly unknown[]).includes(input.time_minutes)) return null;
    out.time_minutes = input.time_minutes as number;
  }
  if ("difficulty" in input) {
    if (!(DIFFICULTIES as readonly unknown[]).includes(input.difficulty)) return null;
    out.difficulty = input.difficulty as Difficulty;
  }
  if ("rounds" in input) {
    if (!(GAME.roundOptions as readonly unknown[]).includes(input.rounds)) return null;
    out.rounds = input.rounds as number;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export interface Phone {
  id: string;
  team: Team;
}

// The first phone is Team Marigold. The next one gets whichever team is free (Marigold again if the
// first phone left before Start). Null when both teams already have a phone.
export function freeTeam(phones: readonly Phone[]): Team | null {
  if (phones.length >= GAME.phonesPerRoom) return null;
  if (!phones.some((p) => p.team === 1)) return 1;
  if (!phones.some((p) => p.team === 2)) return 2;
  return null;
}

export function canStart(phones: readonly Phone[]): boolean {
  return phones.some((p) => p.team === 1) && phones.some((p) => p.team === 2);
}

// If the host phone leaves, the other phone takes over (spec section 3, Lobby).
export function nextHost(phones: readonly Phone[], leavingId: string): string | null {
  return phones.find((p) => p.id !== leavingId)?.id ?? null;
}
