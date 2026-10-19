import { describe, expect, it } from "vitest";
import { DIFFICULTY } from "./config";
import { revealColour, sceneDistance, scoreForDistance, scorePlacement } from "./scoring";

const { rFull, rZero } = DIFFICULTY.medium;
const opts = { rFull, rZero, aspect: 0.625 };

describe("scoreForDistance", () => {
  it("gives 1 inside the full radius", () => {
    expect(scoreForDistance(0, rFull, rZero)).toBe(1);
    expect(scoreForDistance(rFull, rFull, rZero)).toBe(1);
  });

  it("gives 0 at and beyond the zero radius", () => {
    expect(scoreForDistance(rZero, rFull, rZero)).toBe(0);
    expect(scoreForDistance(rZero + 0.5, rFull, rZero)).toBe(0);
  });

  it("falls with a quadratic curve in between", () => {
    const at = (t: number) => scoreForDistance(rFull + t * (rZero - rFull), rFull, rZero);
    expect(at(0.5)).toBeCloseTo(0.25);
    expect(at(0.25)).toBeCloseTo(0.5625);
    expect(at(0.75)).toBeCloseTo(0.0625);
  });

  it("never increases with distance", () => {
    let prev = 1;
    for (let d = 0; d <= 0.5; d += 0.005) {
      const s = scoreForDistance(d, rFull, rZero);
      expect(s).toBeLessThanOrEqual(prev);
      prev = s;
    }
  });
});

describe("sceneDistance", () => {
  it("scales the vertical difference by the aspect ratio", () => {
    expect(sceneDistance({ x: 0.5, y: 0.2 }, { x: 0.5, y: 0.6 }, 0.625)).toBeCloseTo(0.25);
    expect(sceneDistance({ x: 0.1, y: 0.5 }, { x: 0.5, y: 0.5 }, 0.625)).toBeCloseTo(0.4);
  });
});

describe("scorePlacement", () => {
  it("scores an exact placement as 1", () => {
    const r = scorePlacement([{ itemId: "candle", x: 0.3, y: 0.6 }], [{ itemId: "candle", x: 0.3, y: 0.6 }], opts);
    expect(r.items[0].score).toBe(1);
    expect(r.total).toBe(1);
  });

  it("scores a placement beyond r_zero as 0", () => {
    const r = scorePlacement([{ itemId: "candle", x: 0.1, y: 0.5 }], [{ itemId: "candle", x: 0.9, y: 0.5 }], opts);
    expect(r.items[0].score).toBe(0);
  });

  it("respects the aspect ratio: the same vertical offset counts less than horizontal", () => {
    const target = [{ itemId: "candle", x: 0.5, y: 0.5 }];
    const horizontal = scorePlacement(target, [{ itemId: "candle", x: 0.65, y: 0.5 }], opts).total;
    const vertical = scorePlacement(target, [{ itemId: "candle", x: 0.5, y: 0.65 }], opts).total;
    expect(vertical).toBeGreaterThan(horizontal);
    // 0.15 tall at 16:10 equals 0.09375 wide
    const equivalent = scorePlacement(target, [{ itemId: "candle", x: 0.59375, y: 0.5 }], opts).total;
    expect(vertical).toBeCloseTo(equivalent);
  });

  it("matches identical items by minimum total distance, whatever the drop order", () => {
    const targets = [
      { itemId: "candle", x: 0.2, y: 0.5 },
      { itemId: "candle", x: 0.8, y: 0.5 },
    ];
    const a = scorePlacement(targets, [{ itemId: "candle", x: 0.8, y: 0.5 }, { itemId: "candle", x: 0.2, y: 0.5 }], opts);
    const b = scorePlacement(targets, [{ itemId: "candle", x: 0.2, y: 0.5 }, { itemId: "candle", x: 0.8, y: 0.5 }], opts);
    expect(a.total).toBe(2);
    expect(b.total).toBe(2);
    expect(a.items[0].placed).toEqual({ x: 0.2, y: 0.5 });
  });

  it("uses the global minimum, not a greedy nearest match", () => {
    // Greedy would give placed A (0.5) to target 0.45 and leave B far from 0.9.
    const targets = [
      { itemId: "candle", x: 0.45, y: 0.5 },
      { itemId: "candle", x: 0.9, y: 0.5 },
    ];
    const placed = [
      { itemId: "candle", x: 0.5, y: 0.5 },
      { itemId: "candle", x: 0.3, y: 0.5 },
    ];
    const r = scorePlacement(targets, placed, opts);
    const total = r.items.reduce((s, i) => s + (i.distance ?? 0), 0);
    expect(total).toBeCloseTo(0.15 + 0.4); // 0.3->0.45 and 0.5->0.9
  });

  it("matches the best target when fewer copies are placed than exist", () => {
    const targets = [
      { itemId: "skull", x: 0.2, y: 0.5 },
      { itemId: "skull", x: 0.8, y: 0.5 },
    ];
    const r = scorePlacement(targets, [{ itemId: "skull", x: 0.79, y: 0.5 }], opts);
    expect(r.items[0].placed).toBeNull();
    expect(r.items[0].score).toBe(0);
    expect(r.items[1].score).toBe(1);
  });

  it("gives decoys 0 and no penalty", () => {
    const targets = [{ itemId: "candle", x: 0.3, y: 0.6 }];
    const clean = scorePlacement(targets, [{ itemId: "candle", x: 0.3, y: 0.6 }], opts);
    const withDecoy = scorePlacement(
      targets,
      [
        { itemId: "candle", x: 0.3, y: 0.6 },
        { itemId: "pumpkin", x: 0.3, y: 0.6 },
      ],
      opts,
    );
    expect(withDecoy.total).toBe(clean.total);
    expect(withDecoy.items).toHaveLength(1);
  });

  it("scores an unplaced item as 0", () => {
    const r = scorePlacement(
      [
        { itemId: "candle", x: 0.3, y: 0.6 },
        { itemId: "photo", x: 0.5, y: 0.4 },
      ],
      [{ itemId: "candle", x: 0.3, y: 0.6 }],
      opts,
    );
    expect(r.items[1]).toMatchObject({ itemId: "photo", placed: null, score: 0 });
    expect(r.total).toBe(1);
  });

  it("ignores garbage from a tampered client", () => {
    const targets = [{ itemId: "candle", x: 0.3, y: 0.6 }];
    const placed = [
      { itemId: "candle", x: Number.NaN, y: 0.6 },
      { itemId: "candle", x: Infinity, y: 0.6 },
      ...Array.from({ length: 200 }, () => ({ itemId: "candle", x: 5, y: 5 })),
    ];
    const r = scorePlacement(targets, placed, opts);
    expect(r.items[0].placed).toEqual({ x: 1, y: 1 }); // clamped into the scene
    expect(r.total).toBe(0);
  });
});

describe("revealColour", () => {
  it("uses green from 0.8, yellow from 0.4, red below", () => {
    expect(revealColour(1)).toBe("green");
    expect(revealColour(0.8)).toBe("green");
    expect(revealColour(0.79)).toBe("yellow");
    expect(revealColour(0.4)).toBe("yellow");
    expect(revealColour(0.39)).toBe("red");
  });
});
