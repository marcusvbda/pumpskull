// All scene backgrounds with their slots. The slot files are placeholders until /dev/slots (build step 6) replaces them.

import type { Background, Scene } from "@/lib/game/types";
import altar1 from "./slots/altar-1.json";
import altar2 from "./slots/altar-2.json";
import altar3 from "./slots/altar-3.json";
import house1 from "./slots/house-1.json";
import house2 from "./slots/house-2.json";
import house3 from "./slots/house-3.json";

export const BACKGROUNDS = [altar1, altar2, altar3, house1, house2, house3] as Background[];

export function backgroundsFor(scene: Scene): Background[] {
  return BACKGROUNDS.filter((b) => b.scene === scene);
}

export function findBackground(id: string): Background | undefined {
  return BACKGROUNDS.find((b) => b.id === id);
}

export function backgroundSrc(bg: Pick<Background, "id" | "scene">): string {
  return `/scenes/${bg.scene}/${bg.id}.png`;
}
