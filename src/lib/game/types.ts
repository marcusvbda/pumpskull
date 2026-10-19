// Shared game types (spec section 6).

export type Scene = "altar" | "house";
export type Team = 1 | 2; // 1 = Team Marigold, 2 = Team Pumpkin
export type SlotType = "step" | "shelf" | "floor" | "wall" | "door" | "window";
export type Tradition = "dod" | "halloween";
export type Anchor = "bottom" | "center"; // bottom-centre for things on a surface, centre for wall items

export interface Slot {
  id: string;
  x: number; // 0..1, anchor point position
  y: number; // 0..1
  type: SlotType;
  scale: number; // item size in this slot, longest side as a fraction of scene width
}

export interface Background {
  id: string; // also the image name: public/scenes/<scene>/<id>.png
  scene: Scene;
  placeholder?: boolean; // true until the slot editor replaces the file
  slots: Slot[];
}

export interface ItemDef {
  id: string; // unique within a scene catalog
  name: string; // shown on Easy
  sprite: string; // path under public/
  anchor: Anchor;
  slotTypes: SlotType[];
  tradition: Tradition;
  maxCopies?: number; // defaults to LAYOUT.defaultMaxCopies
}

export interface SceneCatalog {
  items: ItemDef[]; // can be targets
  decoys: ItemDef[]; // other tradition, tray only
}
