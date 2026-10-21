import { describe, expect, it } from "vitest";
import { MAX_EFFECT_HZ, MUSIC_MAX_RATE } from "./config";
import { cultureUrgencyFor, urgencyFor, withReducedEffects } from "./urgency";

const TOTAL = 4 * 60_000; // 4 minutes

describe("urgencyFor", () => {
  it("is calm above 50% of the time", () => {
    expect(urgencyFor(TOTAL, TOTAL)).toMatchObject({ phase: 0, shake: "none", tick: "none", vignetteHz: 0, timerColour: "normal" });
    expect(urgencyFor(TOTAL * 0.51, TOTAL).phase).toBe(0);
  });

  it("turns the timer orange between 50% and 25%, with no vignette and no sound", () => {
    for (const f of [0.5, 0.3]) expect(urgencyFor(TOTAL * f, TOTAL)).toMatchObject({ phase: 1, timerColour: "orange", vignetteHz: 0, tick: "none" });
  });

  it("adds the 1 Hz vignette, a light shake and a tick between 25% and 10%", () => {
    expect(urgencyFor(TOTAL * 0.25, TOTAL)).toMatchObject({ phase: 2, timerColour: "red", vignetteHz: 1, shake: "light", tick: "tick" });
    expect(urgencyFor(TOTAL * 0.11, TOTAL).phase).toBe(2);
  });

  it("goes to a strong shake, a 2 Hz vignette and a higher tick in the last 10%", () => {
    expect(urgencyFor(TOTAL * 0.1, TOTAL)).toMatchObject({ phase: 3, vignetteHz: 2, shake: "strong", tick: "fast" });
    expect(urgencyFor(20_000, TOTAL).phase).toBe(3);
  });

  it("starts the last-10% phase at 15 s at the latest, for short plays", () => {
    const short = 2 * 60_000; // 10% is 12 s
    expect(urgencyFor(14_000, short).phase).toBe(3);
    expect(urgencyFor(16_000, short).phase).toBe(2);
  });

  it("has the strongest phase with a beep in the last 5 seconds", () => {
    expect(urgencyFor(5000, TOTAL)).toMatchObject({ phase: 4, tick: "beep", vignetteStrength: 1 });
    expect(urgencyFor(0, TOTAL).phase).toBe(4);
    expect(urgencyFor(-300, TOTAL).phase).toBe(4);
  });

  it("speeds the music up with each phase, never past the single-track limit", () => {
    const rates = [TOTAL, TOTAL * 0.4, TOTAL * 0.2, TOTAL * 0.08, 3000].map((left) => urgencyFor(left, TOTAL).musicRate);
    expect(rates).toEqual([...rates].sort((a, b) => a - b));
    expect(rates[0]).toBe(1);
    for (const r of rates) expect(r).toBeLessThanOrEqual(MUSIC_MAX_RATE);
  });

  it("never pulses faster than the safe rate", () => {
    for (let left = 0; left <= TOTAL; left += 1000) expect(urgencyFor(left, TOTAL).vignetteHz).toBeLessThanOrEqual(MAX_EFFECT_HZ);
  });

  it("gets more urgent as time goes by", () => {
    let last = -1;
    for (let left = TOTAL; left >= 0; left -= 1000) {
      const { phase } = urgencyFor(left, TOTAL);
      expect(phase).toBeGreaterThanOrEqual(last);
      last = phase;
    }
  });

  it("copes with nonsense input", () => {
    expect(urgencyFor(Number.NaN, TOTAL).phase).toBe(4);
    expect(urgencyFor(1000, 0).phase).toBe(4);
  });
});

describe("cultureUrgencyFor", () => {
  it("only reacts in the last 5 seconds, with a lighter effect and no shake", () => {
    expect(cultureUrgencyFor(12_000)).toMatchObject({ phase: 0, vignetteHz: 0, tick: "none" });
    const last = cultureUrgencyFor(4000);
    expect(last).toMatchObject({ tick: "tick", shake: "none", vignetteHz: 1 });
    expect(last.vignetteStrength).toBeLessThan(urgencyFor(4000, 240_000).vignetteStrength);
  });
});

describe("withReducedEffects", () => {
  it("drops shake and pulsing but keeps the sound and the timer colour", () => {
    const u = withReducedEffects(urgencyFor(3000, TOTAL));
    expect(u).toMatchObject({ shake: "none", vignetteHz: 0, timerScale: 1, tick: "beep", timerColour: "red" });
    expect(u.vignetteStrength).toBeLessThanOrEqual(0.35);
  });
});
