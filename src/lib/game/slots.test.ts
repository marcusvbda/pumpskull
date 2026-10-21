import { describe, expect, it } from "vitest";
import { BACKGROUNDS } from "@/data/backgrounds";
import { clampSlot, exportBackground, nextSlotId, slotAnchor, slotIssues } from "./slots";
import type { Background, Slot } from "./types";

const slot = (id: string, over: Partial<Slot> = {}): Slot => ({ id, x: 0.5, y: 0.5, type: "step", scale: 0.09, ...over });

describe("nextSlotId", () => {
  it("numbers slots from s01 and fills gaps", () => {
    expect(nextSlotId([])).toBe("s01");
    expect(nextSlotId([slot("s01"), slot("s03")])).toBe("s02");
  });
});

describe("clampSlot", () => {
  it("keeps a slot inside the scene and its scale in range", () => {
    expect(clampSlot(slot("a", { x: 1.4, y: -0.2, scale: 0.9 }))).toMatchObject({ x: 1, y: 0, scale: 0.25 });
    expect(clampSlot(slot("a", { x: 0.123456, scale: 0.001 }))).toMatchObject({ x: 0.123, scale: 0.04 });
  });
});

describe("slotAnchor", () => {
  it("centres wall items and sits the rest on the surface", () => {
    expect(slotAnchor("wall")).toBe("center");
    expect(slotAnchor("window")).toBe("center");
    expect(slotAnchor("shelf")).toBe("bottom");
  });
});

describe("slotIssues", () => {
  it("accepts every slot file in the project", () => {
    for (const bg of BACKGROUNDS) expect(slotIssues(bg), bg.id).toEqual([]);
  });

  it("asks for 12 to 16 slots", () => {
    const bg: Background = { ...BACKGROUNDS[0], slots: BACKGROUNDS[0].slots.slice(0, 5) };
    expect(slotIssues(bg).join(" ")).toMatch(/5 slots/);
  });

  it("reports an item that has no slot to go on", () => {
    const bg: Background = { ...BACKGROUNDS[0], slots: BACKGROUNDS[0].slots.map((s) => ({ ...s, type: "wall" })) };
    expect(slotIssues(bg).join(" ")).toMatch(/No slot for/);
  });

  it("reports repeated ids", () => {
    const bg: Background = { ...BACKGROUNDS[0], slots: BACKGROUNDS[0].slots.map((s) => ({ ...s, id: "same" })) };
    expect(slotIssues(bg).join(" ")).toMatch(/used twice/);
  });
});

describe("exportBackground", () => {
  it("writes the file format without the placeholder flag", () => {
    const text = exportBackground({ ...BACKGROUNDS[0], placeholder: true });
    const parsed = JSON.parse(text);
    expect(parsed).not.toHaveProperty("placeholder");
    expect(parsed).toMatchObject({ id: BACKGROUNDS[0].id, scene: BACKGROUNDS[0].scene });
    expect(parsed.slots).toHaveLength(BACKGROUNDS[0].slots.length);
    expect(text.endsWith("\n")).toBe(true);
  });
});
