import { describe, expect, it } from "vitest";
import { BACKGROUNDS } from "@/data/backgrounds";
import { CATALOG } from "@/data/items";
import { DIFFICULTY, LAYOUT, type Difficulty } from "./config";
import { generateLayout, LayoutError, planBackgrounds, sceneForPlay } from "./layout";
import { sceneDistance } from "./scoring";
import type { Background } from "./types";

const levels = Object.keys(DIFFICULTY) as Difficulty[];
const altar = BACKGROUNDS.find((b) => b.id === "altar-1")!;

describe("generateLayout", () => {
  it("gives the same layout for the same seed", () => {
    expect(generateLayout(altar, "hard", "abc")).toEqual(generateLayout(altar, "hard", "abc"));
  });

  it("gives different layouts for different seeds", () => {
    const a = generateLayout(altar, "medium", "seed-1");
    const b = generateLayout(altar, "medium", "seed-2");
    expect(a.targets).not.toEqual(b.targets);
  });

  // Runs over every slot file, so a bad file from the slot editor fails here instead of in class.
  describe.each(BACKGROUNDS.map((b) => [b.id, b] as const))("%s", (_id, bg) => {
    it.each(levels)("is valid on %s for 200 seeds", (level) => {
      const catalog = CATALOG[bg.scene];
      const slots = new Map(bg.slots.map((s) => [s.id, s]));
      for (let n = 0; n < 200; n++) {
        const layout = generateLayout(bg, level, `test-${n}`);

        // count and decoys match the level
        expect(layout.targets).toHaveLength(DIFFICULTY[level].items);
        expect(layout.decoys).toHaveLength(DIFFICULTY[level].decoys);
        expect(new Set(layout.decoys).size).toBe(layout.decoys.length);
        for (const d of layout.decoys) expect(catalog.decoys.some((i) => i.id === d)).toBe(true);

        // item types only in allowed slots, one item per slot, copies within limits
        const counts = new Map<string, number>();
        for (const t of layout.targets) {
          const item = catalog.items.find((i) => i.id === t.itemId)!;
          const slot = slots.get(t.slotId)!;
          expect(item.slotTypes).toContain(slot.type);
          expect({ x: t.x, y: t.y }).toEqual({ x: slot.x, y: slot.y });
          counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
        }
        expect(new Set(layout.targets.map((t) => t.slotId)).size).toBe(layout.targets.length);
        for (const [id, c] of counts) {
          const item = catalog.items.find((i) => i.id === id)!;
          expect(c).toBeLessThanOrEqual(item.maxCopies ?? LAYOUT.defaultMaxCopies);
        }

        // no two targets under the minimum distance
        for (let i = 0; i < layout.targets.length; i++)
          for (let j = i + 1; j < layout.targets.length; j++)
            expect(sceneDistance(layout.targets[i], layout.targets[j])).toBeGreaterThanOrEqual(LAYOUT.minSlotDistance);
      }
    });
  });

  it("uses distinct types before repeating any", () => {
    const easy = generateLayout(altar, "easy", "x");
    expect(new Set(easy.targets.map((t) => t.itemId)).size).toBe(6);
    const hard = generateLayout(altar, "hard", "x");
    expect(new Set(hard.targets.map((t) => t.itemId)).size).toBe(CATALOG.altar.items.length);
  });

  it("throws a clear error when the slots cannot fit the level", () => {
    const tiny: Background = {
      id: "tiny",
      scene: "altar",
      slots: [
        { id: "a", x: 0.5, y: 0.5, type: "step", scale: 0.1 },
        { id: "b", x: 0.52, y: 0.5, type: "step", scale: 0.1 },
      ],
    };
    expect(() => generateLayout(tiny, "easy", "s")).toThrow(LayoutError);
  });
});

describe("sceneForPlay", () => {
  it("alternates altar and house by round", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(sceneForPlay)).toEqual([
      "altar", "altar", "house", "house", "altar", "altar", "house", "house",
    ]);
  });
});

describe("planBackgrounds", () => {
  it("never repeats a background in consecutive plays of the same scene", () => {
    for (let n = 0; n < 50; n++) {
      const plan = planBackgrounds(8, `p${n}`, BACKGROUNDS);
      for (const scene of ["altar", "house"] as const) {
        const ids = plan.filter((p) => p.scene === scene).map((p) => p.backgroundId);
        for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
      }
      for (const p of plan) expect(p.backgroundId.startsWith(p.scene)).toBe(true);
    }
  });

  it("uses every background before reusing one", () => {
    const plan = planBackgrounds(4, "s", BACKGROUNDS); // 2 altar plays, 2 house plays
    const plan8 = planBackgrounds(8, "s", BACKGROUNDS); // 4 of each scene, 3 backgrounds each
    expect(new Set(plan.map((p) => p.backgroundId)).size).toBe(4);
    expect(new Set(plan8.filter((p) => p.scene === "altar").map((p) => p.backgroundId)).size).toBe(3);
  });

  it("is deterministic for a seed", () => {
    expect(planBackgrounds(8, "same", BACKGROUNDS)).toEqual(planBackgrounds(8, "same", BACKGROUNDS));
  });

  it("works with a single background per scene", () => {
    const one = BACKGROUNDS.filter((b) => b.id === "altar-1" || b.id === "house-1");
    const plan = planBackgrounds(4, "s", one);
    expect(plan.map((p) => p.backgroundId)).toEqual(["altar-1", "altar-1", "house-1", "house-1"]);
  });
});
