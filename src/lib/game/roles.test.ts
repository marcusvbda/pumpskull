import { describe, expect, it } from "vitest";
import { rolesForPlay } from "./roles";

describe("rolesForPlay", () => {
  it("Marigold describes in x.0 and builds in x.1", () => {
    expect(rolesForPlay(0)).toEqual({ describerTeam: 1, builderTeam: 2 });
    expect(rolesForPlay(1)).toEqual({ describerTeam: 2, builderTeam: 1 });
  });

  it("swaps roles every play, and each team describes once per round", () => {
    for (let round = 0; round < 4; round++) {
      const a = rolesForPlay(round * 2);
      const b = rolesForPlay(round * 2 + 1);
      expect(a.describerTeam).toBe(b.builderTeam);
      expect(a.builderTeam).toBe(b.describerTeam);
      expect(new Set([a.describerTeam, b.describerTeam])).toEqual(new Set([1, 2]));
    }
  });

  it("never gives both roles to the same team", () => {
    for (let i = 0; i < 8; i++) expect(rolesForPlay(i).describerTeam).not.toBe(rolesForPlay(i).builderTeam);
  });

  it("refuses a bad play index", () => {
    for (const bad of [-1, 1.5, NaN]) expect(() => rolesForPlay(bad)).toThrow();
  });
});
