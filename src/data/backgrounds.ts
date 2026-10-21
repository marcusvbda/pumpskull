// All scene backgrounds with their slots: 10 altars and 10 house fronts (docs/ASSETS.md).
// A slot file with "placeholder": true is a copy waiting for its real image. /dev/slots removes the flag when you
// save it, and once any background of a scene is real, the game only uses the real ones (see planBackgrounds).

import type { Background, Scene } from "@/lib/game/types";
import altar1 from "./slots/altar-1.json";
import altar2 from "./slots/altar-2.json";
import altar3 from "./slots/altar-3.json";
import altar4 from "./slots/altar-4.json";
import altar5 from "./slots/altar-5.json";
import altar6 from "./slots/altar-6.json";
import altar7 from "./slots/altar-7.json";
import altar8 from "./slots/altar-8.json";
import altar9 from "./slots/altar-9.json";
import altar10 from "./slots/altar-10.json";
import house1 from "./slots/house-1.json";
import house2 from "./slots/house-2.json";
import house3 from "./slots/house-3.json";
import house4 from "./slots/house-4.json";
import house5 from "./slots/house-5.json";
import house6 from "./slots/house-6.json";
import house7 from "./slots/house-7.json";
import house8 from "./slots/house-8.json";
import house9 from "./slots/house-9.json";
import house10 from "./slots/house-10.json";

export const BACKGROUNDS = [
  altar1, altar2, altar3, altar4, altar5,
  altar6, altar7, altar8, altar9, altar10,
  house1, house2, house3, house4, house5,
  house6, house7, house8, house9, house10,
] as Background[];

export function backgroundsFor(scene: Scene): Background[] {
  return BACKGROUNDS.filter((b) => b.scene === scene);
}

export function findBackground(id: string): Background | undefined {
  return BACKGROUNDS.find((b) => b.id === id);
}

export function backgroundSrc(bg: Pick<Background, "id" | "scene">): string {
  return `/scenes/${bg.scene}/${bg.id}.png`;
}
