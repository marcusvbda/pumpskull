// Row shapes of the PUBLIC tables (supabase/migrations/0001_init.sql). Column names stay snake_case.

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

export interface PlayerRow {
  id: string;
  room_pin: string;
  nickname: string;
  avatar: number;
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
  pairs: { describer_id: string; builder_id: string }[];
  waiting: string[];
}

export interface PlayResultRow {
  room_pin: string;
  play_idx: number;
  results: unknown;
  spirit_gain: number;
}

export interface QuestionPublicRow {
  room_pin: string;
  play_idx: number;
  question_id: number;
  question: string;
  options: string[];
}

export interface QuestionRevealRow {
  room_pin: string;
  play_idx: number;
  correct: number;
  fact: string;
}

export interface TeamScoreRow {
  room_pin: string;
  play_idx: number;
  team: Team;
  avg_points: number;
  avg_ms: number;
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
