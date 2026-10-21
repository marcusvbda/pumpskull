import { describe, expect, it } from "vitest";
import { PLAY } from "./config";
import {
  COUNTDOWN_MS,
  afterScoreboard,
  buildTray,
  countdownEndsAt,
  parsePlacement,
  playClosesAt,
  cultureClosesAt,
  cultureEndsAt,
  feedbackEndsAt,
  playEndsAt,
  totalPlays,
} from "./flow";
import { createRng } from "./rng";

const t0 = Date.parse("2026-11-02T10:00:00.000Z");

describe("timing", () => {
  it("countdown is 3-2-1 plus the 2-second role banner", () => {
    expect(COUNTDOWN_MS).toBe(5000);
    expect(countdownEndsAt(new Date(t0).toISOString())).toBe(t0 + 5000);
  });

  it("play length follows the host's setting, plus a short grace for the last save", () => {
    expect(playEndsAt(t0, { time_minutes: 4 })).toBe(t0 + 240_000);
    expect(playClosesAt(t0, { time_minutes: 2 })).toBe(t0 + 120_000 + PLAY.finishGraceSeconds * 1000);
  });

  it("Culture Check runs 20 s, accepts a late answer for the grace time, then shows feedback for 10 s", () => {
    expect(cultureEndsAt(t0)).toBe(t0 + 20_000);
    expect(cultureClosesAt(t0)).toBe(t0 + 20_000 + PLAY.finishGraceSeconds * 1000);
    expect(feedbackEndsAt(t0)).toBe(t0 + 10_000);
  });

  it("has two plays per round", () => {
    expect(totalPlays({ rounds: 2 })).toBe(4);
    expect(totalPlays({ rounds: 4 })).toBe(8);
  });

  it("goes to the next play after a scoreboard, and finishes after the last one", () => {
    expect(afterScoreboard(0, { rounds: 2 })).toEqual({ phase: "countdown", play: 1 });
    expect(afterScoreboard(2, { rounds: 2 })).toEqual({ phase: "countdown", play: 3 });
    expect(afterScoreboard(3, { rounds: 2 })).toEqual({ phase: "finished" });
    expect(afterScoreboard(7, { rounds: 4 })).toEqual({ phase: "finished" });
  });
});

describe("buildTray", () => {
  const targets = [{ itemId: "candle" }, { itemId: "candle" }, { itemId: "photo" }];

  it("counts repeated items and adds each decoy once", () => {
    const tray = buildTray(targets, ["pumpkin", "bat"], createRng("t"));
    expect([...tray].sort((a, b) => a.itemId.localeCompare(b.itemId))).toEqual([
      { itemId: "bat", count: 1 },
      { itemId: "candle", count: 2 },
      { itemId: "photo", count: 1 },
      { itemId: "pumpkin", count: 1 },
    ]);
  });

  it("holds no positions", () => {
    const tray = buildTray([{ itemId: "candle", x: 0.3, y: 0.4, slotId: "s1", scale: 0.1 } as never], [], createRng("t"));
    expect(Object.keys(tray[0]).sort()).toEqual(["count", "itemId"]);
  });

  it("mixes the order with the seed, so decoys are not always last", () => {
    const lastIds = new Set<string>();
    for (let i = 0; i < 30; i++) lastIds.add(buildTray(targets, ["pumpkin"], createRng(`s${i}`)).at(-1)!.itemId);
    expect(lastIds.size).toBeGreaterThan(1);
  });
});

describe("parsePlacement", () => {
  const tray = [
    { itemId: "candle", count: 2 },
    { itemId: "pumpkin", count: 1 },
  ];

  it("keeps valid items and clamps them into the scene", () => {
    expect(parsePlacement([{ itemId: "candle", x: 0.2, y: 1.4 }, { itemId: "pumpkin", x: -1, y: 0.5 }], tray)).toEqual([
      { itemId: "candle", x: 0.2, y: 1 },
      { itemId: "pumpkin", x: 0, y: 0.5 },
    ]);
  });

  it("ignores unknown items and copies beyond the tray count", () => {
    const placed = parsePlacement(
      [
        { itemId: "candle", x: 0.1, y: 0.1 },
        { itemId: "candle", x: 0.2, y: 0.2 },
        { itemId: "candle", x: 0.3, y: 0.3 },
        { itemId: "ghost", x: 0.4, y: 0.4 },
      ],
      tray,
    );
    expect(placed).toEqual([
      { itemId: "candle", x: 0.1, y: 0.1 },
      { itemId: "candle", x: 0.2, y: 0.2 },
    ]);
  });

  it("drops extra fields", () => {
    expect(parsePlacement([{ itemId: "candle", x: 0.5, y: 0.5, score: 99 }], tray)).toEqual([{ itemId: "candle", x: 0.5, y: 0.5 }]);
  });

  it("refuses payloads that are not a list of items", () => {
    for (const bad of [null, "x", {}, [null], [{ itemId: "candle", x: "1", y: 0 }], [{ itemId: "candle", x: NaN, y: 0 }], [{ itemId: 3, x: 0, y: 0 }]]) {
      expect(parsePlacement(bad, tray), JSON.stringify(bad)).toBeNull();
    }
    expect(parsePlacement(Array.from({ length: PLAY.maxPlacedItems + 1 }, () => ({ itemId: "candle", x: 0, y: 0 })), tray)).toBeNull();
  });

  it("accepts an empty build", () => {
    expect(parsePlacement([], tray)).toEqual([]);
  });
});
