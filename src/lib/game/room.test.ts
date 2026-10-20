import { describe, expect, it } from "vitest";
import { createRng } from "./rng";
import { canStart, fail, freeTeam, nextHost, parsePin, parseSettings, randomPin, type Phone } from "./room";

const marigold: Phone = { id: "a", team: 1 };
const pumpkin: Phone = { id: "b", team: 2 };

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

describe("freeTeam", () => {
  it("makes the first phone Team Marigold and the second Team Pumpkin", () => {
    expect(freeTeam([])).toBe(1);
    expect(freeTeam([marigold])).toBe(2);
  });

  it("gives Marigold to the next phone when the Marigold phone left first", () => {
    expect(freeTeam([pumpkin])).toBe(1);
  });

  it("refuses a third phone", () => {
    expect(freeTeam([marigold, pumpkin])).toBeNull();
    expect(freeTeam([pumpkin, marigold])).toBeNull();
  });
});

describe("canStart", () => {
  it("needs both team phones", () => {
    expect(canStart([])).toBe(false);
    expect(canStart([marigold])).toBe(false);
    expect(canStart([pumpkin])).toBe(false);
    expect(canStart([marigold, pumpkin])).toBe(true);
  });
});

describe("nextHost", () => {
  it("is the other phone", () => {
    expect(nextHost([marigold, pumpkin], "a")).toBe("b");
    expect(nextHost([marigold, pumpkin], "b")).toBe("a");
  });

  it("is null when nobody is left", () => {
    expect(nextHost([marigold], "a")).toBeNull();
  });
});

describe("fail", () => {
  it("carries a message for the screen", () => {
    expect(fail("room_full")).toMatchObject({ ok: false, error: "room_full" });
    expect(fail("room_full").message).toContain("full");
  });
});
