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
  it("has one phone per team", () => {
    expect(GAME.phonesPerRoom).toBe(2);
  });
  it("gives the fast bonus only inside the Culture Check time", () => {
    expect(GAME.cultureFastSeconds).toBeLessThan(GAME.cultureSeconds);
  });
});
