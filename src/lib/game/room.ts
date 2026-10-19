// Room rules that need no database (spec sections 3 and 9): input parsing, settings, PIN, host handover.
// The server actions in src/app/actions/room.ts wrap these with Supabase reads and writes.

import { GAME, type Difficulty } from "./config";
import type { Rng } from "./rng";
import { byJoinOrder, type TeamMember } from "./teams";
import type { NicknameProblem } from "./nickname";
import type { RoomSettings } from "@/lib/supabase/types";

export const ROOM_ERRORS = {
  invalid_pin: "The PIN has 4 digits.",
  unknown_pin: "We can't find that room. Check the PIN.",
  room_full: "This room is full (20 players).",
  game_started: "This game has already started.",
  nickname_length: `Your nickname needs ${GAME.nicknameMin} to ${GAME.nicknameMax} characters.`,
  nickname_chars: "Use only letters, numbers, spaces, _ - and .",
  nickname_bad: "Please pick a different nickname.",
  nickname_taken: "Someone in this room already has that nickname.",
  invalid_avatar: "Pick an avatar.",
  invalid_settings: "Those settings are not allowed.",
  invalid_request: "Something is wrong with that request.",
  not_host: "Only the host can do that.",
  not_in_room: "You are not in this room.",
  need_players: "Each team needs at least 1 player to start.",
  no_pin: "We could not create a room. Try again.",
  server: "Something went wrong. Try again.",
} as const;

export type RoomError = keyof typeof ROOM_ERRORS;

export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: RoomError; message: string };

export function fail(error: RoomError): { ok: false; error: RoomError; message: string } {
  return { ok: false, error, message: ROOM_ERRORS[error] };
}

export const NICKNAME_ERROR: Record<NicknameProblem, RoomError> = {
  length: "nickname_length",
  chars: "nickname_chars",
  bad_word: "nickname_bad",
};

export function parsePin(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}$/.test(value) ? value : null;
}

export function parseAvatar(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= GAME.avatarCount ? value : null;
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

// If the host leaves, the oldest player still in the room takes over (spec section 3, Lobby).
export function nextHost(players: readonly TeamMember[], leavingId: string): string | null {
  return byJoinOrder(players.filter((p) => p.id !== leavingId))[0]?.id ?? null;
}
