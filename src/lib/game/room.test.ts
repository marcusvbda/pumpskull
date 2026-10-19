import { describe, expect, it } from "vitest";
import { createRng } from "./rng";
import { fail, nextHost, parseAvatar, parsePin, parseSettings, randomPin } from "./room";
import type { TeamMember } from "./teams";

const member = (id: string, joinedAt: number): TeamMember => ({ id, team: 1, joinedAt });

describe("parsePin / randomPin", () => {
  it("accepts exactly 4 digits", () => {
    expect(parsePin("0042")).toBe("0042");
    for (const bad of ["042", "12345", "12a4", "", 1234, null, undefined]) expect(parsePin(bad)).toBeNull();
  });

  it("always makes a 4-digit PIN, with leading zeros", () => {
    expect(randomPin(() => 0)).toBe("0000");
    expect(randomPin(() => 0.99999)).toBe("9999");
    const rng = createRng("pins");
    for (let i = 0; i < 200; i++) expect(parsePin(randomPin(rng))).not.toBeNull();
  });
});

describe("parseAvatar", () => {
  it("accepts integers 1 to 50 only", () => {
    expect(parseAvatar(1)).toBe(1);
    expect(parseAvatar(50)).toBe(50);
    for (const bad of [0, 51, -1, 1.5, "7", NaN, null]) expect(parseAvatar(bad)).toBeNull();
  });
});

describe("parseSettings", () => {
  it("accepts every allowed value", () => {
    for (const time_minutes of [2, 3, 4, 5]) expect(parseSettings({ time_minutes })).toEqual({ time_minutes });
    for (const difficulty of ["easy", "medium", "hard"]) expect(parseSettings({ difficulty })).toEqual({ difficulty });
    for (const rounds of [2, 4]) expect(parseSettings({ rounds })).toEqual({ rounds });
  });

  it("refuses anything else", () => {
    for (const bad of [{ time_minutes: 1 }, { time_minutes: "4" }, { difficulty: "extreme" }, { rounds: 3 }, { rounds: 6 }, {}, null, [], "easy"]) {
      expect(parseSettings(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("refuses the whole patch if one field is bad, and drops unknown keys", () => {
    expect(parseSettings({ time_minutes: 3, rounds: 5 })).toBeNull();
    expect(parseSettings({ rounds: 4, host_id: "x" })).toEqual({ rounds: 4 });
  });
});

describe("nextHost", () => {
  it("is the oldest player who stays", () => {
    const players = [member("c", 30), member("a", 10), member("b", 20)];
    expect(nextHost(players, "a")).toBe("b");
    expect(nextHost(players, "c")).toBe("a");
  });

  it("is null when nobody is left", () => {
    expect(nextHost([member("a", 1)], "a")).toBeNull();
  });
});

describe("fail", () => {
  it("carries a message for the screen", () => {
    expect(fail("room_full")).toMatchObject({ ok: false, error: "room_full" });
    expect(fail("room_full").message).toContain("full");
  });
});
