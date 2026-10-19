// Team assignment and balancing (spec section 3, Lobby).

import { GAME } from "./config";
import type { Rng } from "./rng";
import type { Team } from "./types";

export interface TeamMember {
  id: string;
  team: Team;
  joinedAt: string | number; // ISO timestamp or epoch ms, compared in order
}

export interface TeamMove {
  playerId: string;
  from: Team;
  to: Team;
}

const time = (p: TeamMember) => (typeof p.joinedAt === "number" ? p.joinedAt : Date.parse(p.joinedAt));

// Oldest first; ties broken by id so every server call agrees.
export function byJoinOrder<T extends TeamMember>(players: readonly T[]): T[] {
  return [...players].sort((a, b) => time(a) - time(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function teamCounts(players: readonly TeamMember[]): Record<Team, number> {
  const counts: Record<Team, number> = { 1: 0, 2: 0 };
  for (const p of players) counts[p.team]++;
  return counts;
}

// Team for a new joiner: the smaller team, or a random one when equal. Null when the room is full.
export function assignTeam(players: readonly TeamMember[], rng: Rng): Team | null {
  if (players.length >= GAME.maxPlayers) return null;
  const c = teamCounts(players);
  let team: Team;
  if (c[1] === c[2]) team = rng() < 0.5 ? 1 : 2;
  else team = c[1] < c[2] ? 1 : 2;
  return c[team] < GAME.maxPerTeam ? team : null;
}

export function canStart(players: readonly TeamMember[]): boolean {
  const c = teamCounts(players);
  return c[1] >= 1 && c[2] >= 1;
}

// On Start: while the teams differ by more than 1, move the latest joiner of the bigger team.
export function rebalanceTeams<T extends TeamMember>(players: readonly T[]): { players: T[]; moves: TeamMove[] } {
  const result = players.map((p) => ({ ...p }));
  const moves: TeamMove[] = [];
  for (;;) {
    const c = teamCounts(result);
    if (Math.abs(c[1] - c[2]) <= 1) break;
    const from: Team = c[1] > c[2] ? 1 : 2;
    const to: Team = from === 1 ? 2 : 1;
    const latest = byJoinOrder(result.filter((p) => p.team === from)).at(-1)!;
    latest.team = to;
    moves.push({ playerId: latest.id, from, to });
  }
  return { players: result, moves };
}
