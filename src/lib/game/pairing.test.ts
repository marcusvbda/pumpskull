import { describe, expect, it } from "vitest";
import { describerTeamForPlay, pairPlayers } from "./pairing";
import type { TeamMember } from "./teams";
import type { Team } from "./types";

function roster(team1: number, team2: number): TeamMember[] {
  return [
    ...Array.from({ length: team1 }, (_, i) => ({ id: `m${i}`, team: 1 as Team, joinedAt: i })),
    ...Array.from({ length: team2 }, (_, i) => ({ id: `p${i}`, team: 2 as Team, joinedAt: 50 + i })),
  ];
}

const teamOf = (players: TeamMember[], id: string) => players.find((p) => p.id === id)!.team;

describe("pairPlayers", () => {
  it("swaps roles between x.0 and x.1", () => {
    expect([0, 1, 2, 3].map(describerTeamForPlay)).toEqual([1, 2, 1, 2]);
    const players = roster(3, 3);
    const p0 = pairPlayers(players, 0);
    const p1 = pairPlayers(players, 1);
    for (const pair of p0.pairs) expect(teamOf(players, pair.describerId)).toBe(1);
    for (const pair of p1.pairs) expect(teamOf(players, pair.describerId)).toBe(2);
  });

  it("keeps the same partners inside a round when nobody waits", () => {
    const players = roster(4, 4);
    for (const round of [0, 1, 2, 3]) {
      const a = pairPlayers(players, round * 2).pairs.map((p) => [p.describerId, p.builderId].sort().join("-"));
      const b = pairPlayers(players, round * 2 + 1).pairs.map((p) => [p.describerId, p.builderId].sort().join("-"));
      expect(new Set(b)).toEqual(new Set(a));
    }
  });

  it("changes partners between rounds", () => {
    const players = roster(4, 4);
    const r0 = pairPlayers(players, 0).pairs;
    const r1 = pairPlayers(players, 2).pairs;
    expect(r1).not.toEqual(r0);
  });

  it("never pairs two players of the same team and uses each player once", () => {
    for (let t1 = 1; t1 <= 10; t1++)
      for (let t2 = 1; t2 <= 10; t2++) {
        const players = roster(t1, t2);
        for (let play = 0; play < 8; play++) {
          const { pairs, waiting } = pairPlayers(players, play);
          expect(pairs).toHaveLength(Math.min(t1, t2));
          expect(waiting).toHaveLength(Math.abs(t1 - t2));
          for (const pair of pairs) expect(teamOf(players, pair.describerId)).not.toBe(teamOf(players, pair.builderId));
          const ids = [...pairs.flatMap((p) => [p.describerId, p.builderId]), ...waiting];
          expect(new Set(ids).size).toBe(players.length);
        }
      }
  });

  it("rotates waiting players so nobody waits twice before everyone waited once", () => {
    const players = roster(10, 9);
    const waits = new Map<string, number>();
    for (let play = 0; play < 8; play++) {
      const { waiting } = pairPlayers(players, play);
      expect(waiting).toHaveLength(1);
      expect(teamOf(players, waiting[0])).toBe(1);
      waits.set(waiting[0], (waits.get(waiting[0]) ?? 0) + 1);
    }
    expect(waits.size).toBe(8); // 8 plays, 8 different players
  });

  it("spreads waiting evenly with a large difference", () => {
    const players = roster(1, 4); // 3 of team 2 wait every play
    const waits = new Map<string, number>();
    for (let play = 0; play < 8; play++)
      for (const id of pairPlayers(players, play).waiting) waits.set(id, (waits.get(id) ?? 0) + 1);
    const counts = [...waits.values()];
    expect(waits.size).toBe(4);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });
});
