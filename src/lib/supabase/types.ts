// Row shapes of the PUBLIC tables (supabase/migrations/0001_init.sql, changed by 0003). Column names stay snake_case.

import type { Difficulty } from "@/lib/game/config";
import type { Scene, Team } from "@/lib/game/types";

export type Phase = "lobby" | "countdown" | "playing" | "reveal" | "culture" | "culture_feedback" | "scoreboard" | "finished";

export interface RoomSettings {
  time_minutes: number;
  difficulty: Difficulty;
  rounds: number;
}

export interface RoomRow {
  pin: string;
  status: "lobby" | "playing" | "finished";
  host_id: string | null;
  settings: RoomSettings;
  current_play: number;
  phase: Phase;
  phase_started_at: string;
  play_started_at: string | null;
  spirit_meter: number;
  created_at: string;
}

// One row per phone: at most 2 per room, one per team.
export interface PlayerRow {
  id: string;
  room_pin: string;
  team: Team;
  joined_at: string;
  last_seen: string;
}

export interface PlayRow {
  room_pin: string;
  idx: number;
  scene: Scene;
  background_id: string;
  describer_team: Team;
}

// One entry per target item, written at reveal time (never before: it holds the target positions).
export interface PlayResultItem {
  item_id: string;
  target: { x: number; y: number };
  scale: number; // size of the target slot, fraction of scene width
  placed: { x: number; y: number } | null;
  score: number; // 0..1
}

export interface PlayResultRow {
  room_pin: string;
  play_idx: number;
  results: { items: PlayResultItem[]; total: number };
  spirit_gain: number;
}

export interface QuestionPublicRow {
  room_pin: string;
  play_idx: number;
  question_id: number;
  question: string;
  options: string[];
}

// How one team answered. option null = no answer in time.
export interface CultureAnswer {
  team: Team;
  option: number | null;
  ms: number;
  points: number;
}

export interface QuestionRevealRow {
  room_pin: string;
  play_idx: number;
  correct: number;
  fact: string;
  answers: CultureAnswer[];
}

export interface TeamScoreRow {
  room_pin: string;
  play_idx: number;
  team: Team;
  points: number; // sum of Culture Check points so far
  total_ms: number; // sum of answer times, the tie-break
}

// What subscribeRoom delivers: everything a client may know about a room, nothing private.
export interface RoomSnapshot {
  room: RoomRow;
  players: PlayerRow[];
  plays: PlayRow[];
  playResults: PlayResultRow[];
  questionPublic: QuestionPublicRow[];
  questionReveal: QuestionRevealRow[];
  teamScores: TeamScoreRow[];
  serverTime: string; // for the clock offset (spec section 8, Time sync)
}

// Tables subscribeRoom listens to, with the column that holds the room PIN.
export const PUBLIC_ROOM_TABLES = [
  { table: "rooms", pinColumn: "pin" },
  { table: "players", pinColumn: "room_pin" },
  { table: "plays", pinColumn: "room_pin" },
  { table: "play_results", pinColumn: "room_pin" },
  { table: "question_public", pinColumn: "room_pin" },
  { table: "question_reveal", pinColumn: "room_pin" },
  { table: "team_scores", pinColumn: "room_pin" },
] as const;
