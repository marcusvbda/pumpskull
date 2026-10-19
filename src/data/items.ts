// Item catalog per scene (spec section 6, file names from docs/ASSETS.md).
// Proposals: anchors, slot types and copies may change once the sprites exist.

import type { ItemDef, Scene, SceneCatalog } from "@/lib/game/types";

const altarItems: ItemDef[] = [
  { id: "marigold-vase", name: "Marigold vase", sprite: "/items/altar/marigold-vase.png", anchor: "bottom", slotTypes: ["step", "shelf", "floor"], tradition: "dod", maxCopies: 2 },
  { id: "candle", name: "Candle", sprite: "/items/altar/candle.png", anchor: "bottom", slotTypes: ["step", "shelf", "floor"], tradition: "dod", maxCopies: 3 },
  { id: "photo", name: "Framed photo", sprite: "/items/altar/photo.png", anchor: "bottom", slotTypes: ["step", "shelf"], tradition: "dod", maxCopies: 2 },
  { id: "bread", name: "Pan de muerto", sprite: "/items/altar/bread.png", anchor: "bottom", slotTypes: ["step", "shelf"], tradition: "dod", maxCopies: 2 },
  { id: "sugar-skull", name: "Sugar skull", sprite: "/items/altar/sugar-skull.png", anchor: "bottom", slotTypes: ["step", "shelf"], tradition: "dod", maxCopies: 3 },
  { id: "water", name: "Glass of water", sprite: "/items/altar/water.png", anchor: "bottom", slotTypes: ["step", "shelf"], tradition: "dod", maxCopies: 2 },
  { id: "incense", name: "Incense burner", sprite: "/items/altar/incense.png", anchor: "bottom", slotTypes: ["step", "floor"], tradition: "dod" },
  { id: "fruit", name: "Fruit bowl", sprite: "/items/altar/fruit.png", anchor: "bottom", slotTypes: ["step", "shelf", "floor"], tradition: "dod", maxCopies: 2 },
];

const altarDecoys: ItemDef[] = [
  { id: "pumpkin", name: "Pumpkin", sprite: "/items/decoys/pumpkin.png", anchor: "bottom", slotTypes: ["floor", "step"], tradition: "halloween" },
  { id: "cobweb", name: "Cobweb", sprite: "/items/decoys/cobweb.png", anchor: "center", slotTypes: ["wall"], tradition: "halloween" },
  { id: "bat", name: "Bat", sprite: "/items/decoys/bat.png", anchor: "center", slotTypes: ["wall"], tradition: "halloween" },
  { id: "ghost", name: "Ghost", sprite: "/items/decoys/ghost.png", anchor: "center", slotTypes: ["wall"], tradition: "halloween" },
];

const houseItems: ItemDef[] = [
  { id: "witch", name: "Witch", sprite: "/items/house/witch.png", anchor: "bottom", slotTypes: ["floor"], tradition: "halloween" },
  { id: "cauldron", name: "Cauldron", sprite: "/items/house/cauldron.png", anchor: "bottom", slotTypes: ["floor"], tradition: "halloween" },
  { id: "jack-o-lantern", name: "Jack-o'-lantern", sprite: "/items/house/jack-o-lantern.png", anchor: "bottom", slotTypes: ["floor", "window"], tradition: "halloween", maxCopies: 3 },
  { id: "bat-lights", name: "Bat lights", sprite: "/items/house/bat-lights.png", anchor: "center", slotTypes: ["wall", "door"], tradition: "halloween", maxCopies: 2 },
  { id: "cobweb", name: "Cobweb", sprite: "/items/house/cobweb.png", anchor: "center", slotTypes: ["wall", "door", "window"], tradition: "halloween", maxCopies: 2 },
  { id: "spider", name: "Spider", sprite: "/items/house/spider.png", anchor: "center", slotTypes: ["wall", "door", "window"], tradition: "halloween", maxCopies: 3 },
  { id: "candy-corn", name: "Candy corn", sprite: "/items/house/candy-corn.png", anchor: "bottom", slotTypes: ["floor", "window"], tradition: "halloween", maxCopies: 2 },
  { id: "ghost", name: "Ghost", sprite: "/items/house/ghost.png", anchor: "center", slotTypes: ["wall", "door", "window"], tradition: "halloween", maxCopies: 2 },
];

// The spec lists 3 house decoys but Hard needs 4: pan de muerto is added as the fourth.
const houseDecoys: ItemDef[] = [
  { id: "marigold-vase", name: "Marigold vase", sprite: "/items/altar/marigold-vase.png", anchor: "bottom", slotTypes: ["floor"], tradition: "dod" },
  { id: "candle", name: "Candle", sprite: "/items/altar/candle.png", anchor: "bottom", slotTypes: ["floor"], tradition: "dod" },
  { id: "sugar-skull", name: "Sugar skull", sprite: "/items/altar/sugar-skull.png", anchor: "bottom", slotTypes: ["floor"], tradition: "dod" },
  { id: "bread", name: "Pan de muerto", sprite: "/items/altar/bread.png", anchor: "bottom", slotTypes: ["floor"], tradition: "dod" },
];

export const CATALOG: Record<Scene, SceneCatalog> = {
  altar: { items: altarItems, decoys: altarDecoys },
  house: { items: houseItems, decoys: houseDecoys },
};

export function findItem(scene: Scene, itemId: string): ItemDef | undefined {
  const c = CATALOG[scene];
  return c.items.find((i) => i.id === itemId) ?? c.decoys.find((i) => i.id === itemId);
}
