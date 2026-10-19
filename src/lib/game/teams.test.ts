import { describe, expect, it } from "vitest";
import { GAME } from "./config";
import { createRng } from "./rng";
import { assignTeam, canStart, rebalanceTeams, teamCounts, type TeamMember } from "./teams";
import type { Team } from "./types";

const member = (id: string, team: Team, joinedAt: number): TeamMember => ({ id, team, joinedAt });

describe("assignTeam", () => {
  it("keeps the teams within 1 player while 20 players join", () => {
    for (let n = 0; n < 50; n++) {
      const rng = createRng(`join-${n}`);
      const players: TeamMember[] = [];
      for (let i = 0; i < GAME.maxPlayers; i++) {
        const team = assignTeam(players, rng);
        expect(team).not.toBeNull();
        players.push(member(`p${i}`, team!, i));
        const c = teamCounts(players);
        expect(Math.abs(c[1] - c[2])).toBeLessThanOrEqual(1);
      }
      expect(teamCounts(players)).toEqual({ 1: 10, 2: 10 });
    }
  });

  it("is random when the teams are equal", () => {
    const seen = new Set<Team | null>();
    for (let n = 0; n < 40; n++) seen.add(assignTeam([], createRng(`r${n}`)));
    expect(seen).toEqual(new Set([1, 2]));
  });

  it("fills the smaller team after someone leaves", () => {
    const players = [member("a", 1, 1), member("b", 1, 2), member("c", 1, 3), member("d", 2, 4)];
    expect(assignTeam(players, createRng("x"))).toBe(2);
  });

  it("refuses the 21st player", () => {
    const full = Array.from({ length: 20 }, (_, i) => member(`p${i}`, i % 2 === 0 ? 1 : 2, i));
    expect(assignTeam(full, createRng("x"))).toBeNull();
  });
});

describe("canStart", () => {
  it("is blocked until each team has 1 player", () => {
    expect(canStart([])).toBe(false);
    expect(canStart([member("a", 1, 1)])).toBe(false);
    expect(canStart([member("a", 1, 1), member("b", 1, 2)])).toBe(false);
    expect(canStart([member("a", 1, 1), member("b", 2, 2)])).toBe(true);
  });
});

describe("rebalanceTeams", () => {
  it("does nothing when teams differ by at most 1", () => {
    const players = [member("a", 1, 1), member("b", 1, 2), member("c", 2, 3)];
    expect(rebalanceTeams(players).moves).toEqual([]);
  });

  it("moves the most recent joiners of the bigger team", () => {
    // Team 1 has 5 (joined at 1, 2, 3, 6, 7), team 2 has 1. Two moves needed: the joiners at 7 then 6.
    const players = [
      member("a", 1, 1),
      member("b", 1, 2),
      member("c", 1, 3),
      member("z", 2, 4),
      member("d", 1, 6),
      member("e", 1, 7),
    ];
    const { players: after, moves } = rebalanceTeams(players);
    expect(moves).toEqual([
      { playerId: "e", from: 1, to: 2 },
      { playerId: "d", from: 1, to: 2 },
    ]);
    expect(teamCounts(after)).toEqual({ 1: 3, 2: 3 });
  });

  it("accepts ISO timestamps and does not mutate the input", () => {
    const players = [
      { id: "a", team: 2 as Team, joinedAt: "2026-10-19T10:00:00Z" },
      { id: "b", team: 2 as Team, joinedAt: "2026-10-19T10:05:00Z" },
      { id: "c", team: 2 as Team, joinedAt: "2026-10-19T10:01:00Z" },
    ];
    const { players: after, moves } = rebalanceTeams(players);
    expect(moves).toEqual([{ playerId: "b", from: 2, to: 1 }]);
    expect(players[1].team).toBe(2);
    expect(after.find((p) => p.id === "b")!.team).toBe(1);
  });

  it("always ends with teams within 1", () => {
    for (let t1 = 0; t1 <= 10; t1++)
      for (let t2 = 0; t2 <= 10; t2++) {
        const players = [
          ...Array.from({ length: t1 }, (_, i) => member(`a${i}`, 1, i)),
          ...Array.from({ length: t2 }, (_, i) => member(`b${i}`, 2, 100 + i)),
        ];
        const c = teamCounts(rebalanceTeams(players).players);
        expect(Math.abs(c[1] - c[2])).toBeLessThanOrEqual(1);
      }
  });
});
