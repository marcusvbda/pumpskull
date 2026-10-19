// Cross-team pairing per play (spec section 3, Rounds and plays).

import { byJoinOrder, type TeamMember } from "./teams";
import type { Team } from "./types";

export interface Pair {
  describerId: string;
  builderId: string;
}

export interface PlayPairing {
  playIdx: number;
  describerTeam: Team;
  pairs: Pair[];
  waiting: string[]; // extra players of the bigger team; they still answer the Culture Check
}

// Play x.0: Team 1 describes. Play x.1: roles swap.
export function describerTeamForPlay(playIdx: number): Team {
  return playIdx % 2 === 0 ? 1 : 2;
}

// Picks `count` players to wait, rotating through the team so everyone waits about the same number of times.
function waitingFor<T>(ordered: readonly T[], count: number, playIdx: number): Set<T> {
  const out = new Set<T>();
  if (count <= 0) return out;
  const start = (playIdx * count) % ordered.length;
  for (let i = 0; i < count; i++) out.add(ordered[(start + i) % ordered.length]);
  return out;
}

// `players` is the roster fixed at Start (joins are closed once the game starts).
export function pairPlayers(players: readonly TeamMember[], playIdx: number): PlayPairing {
  const describerTeam = describerTeamForPlay(playIdx);
  const builderTeam: Team = describerTeam === 1 ? 2 : 1;
  const describers = byJoinOrder(players.filter((p) => p.team === describerTeam));
  const builders = byJoinOrder(players.filter((p) => p.team === builderTeam));
  const size = Math.min(describers.length, builders.length);

  const waitD = waitingFor(describers, describers.length - size, playIdx);
  const waitB = waitingFor(builders, builders.length - size, playIdx);
  const activeD = describers.filter((p) => !waitD.has(p));
  const activeB = builders.filter((p) => !waitB.has(p));

  // Shift partners each round so players meet someone new. Play x.1 uses the opposite shift, so when
  // nobody waits the same two players just swap roles inside a round.
  const shift = size > 0 ? Math.floor(playIdx / 2) % size : 0;
  const offset = playIdx % 2 === 0 ? shift : size - shift;
  const pairs: Pair[] = activeD.map((d, i) => ({
    describerId: d.id,
    builderId: activeB[(i + offset) % size].id,
  }));

  return {
    playIdx,
    describerTeam,
    pairs,
    waiting: [...waitD, ...waitB].map((p) => p.id),
  };
}
