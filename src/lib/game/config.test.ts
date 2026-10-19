import { describe, expect, it } from "vitest";
import { DIFFICULTY, GAME } from "./config";

describe("config invariants", () => {
  it("has full radius smaller than zero radius on every level", () => {
    for (const d of Object.values(DIFFICULTY)) expect(d.rFull).toBeLessThan(d.rZero);
  });
  it("gets harder with each level", () => {
    expect(DIFFICULTY.easy.items).toBeLessThan(DIFFICULTY.medium.items);
    expect(DIFFICULTY.medium.items).toBeLessThan(DIFFICULTY.hard.items);
    expect(DIFFICULTY.easy.rZero).toBeGreaterThan(DIFFICULTY.hard.rZero);
  });
  it("keeps room size consistent", () => {
    expect(GAME.maxPerTeam * 2).toBe(GAME.maxPlayers);
  });
});
