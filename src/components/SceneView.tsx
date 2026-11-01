"use client";

// A scene background with items on it. Scene files are 16:10, but phones show them with the sides cut
// (SCENE_CROP_X) so everything is bigger. Item positions stay in whole-scene fractions: the anchor point
// (bottom-centre for things on a surface, centre for wall items).

import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, Ref } from "react";
import { backgroundSrc } from "@/data/backgrounds";
import { findItem } from "@/data/items";
import { SCENE_ASPECT, SCENE_CROP_X } from "@/lib/game/config";
import type { Anchor, Scene } from "@/lib/game/types";
import { GameImage } from "./GameImage";

export function anchorTransform(anchor: Anchor): string {
  return anchor === "bottom" ? "translate(-50%, -100%)" : "translate(-50%, -50%)";
}

const VISIBLE_WIDTH = 1 - 2 * SCENE_CROP_X;

export function SceneView({
  scene,
  backgroundId,
  children,
  sceneRef,
  onPointerDown,
  className = "",
}: {
  scene: Scene;
  backgroundId: string;
  children?: ReactNode;
  sceneRef?: Ref<HTMLDivElement>; // the whole scene, so its rectangle converts to scene fractions
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  className?: string;
}) {
  return (
    <div onPointerDown={onPointerDown} className={`relative overflow-hidden ${className || "w-full"}`} style={{ aspectRatio: `${VISIBLE_WIDTH} / ${SCENE_ASPECT}` }}>
      <div
        ref={sceneRef}
        className="absolute inset-y-0"
        style={{ width: `${100 / VISIBLE_WIDTH}%`, left: `${(-100 * SCENE_CROP_X) / VISIBLE_WIDTH}%` }}
      >
        <GameImage src={backgroundSrc({ scene, id: backgroundId })} label={backgroundId} variant="scene" className="absolute inset-0 h-full w-full" />
        {children}
      </div>
    </div>
  );
}

export function SceneItem({
  scene,
  itemId,
  x,
  y,
  scale,
  hidden = false,
  children,
  style,
}: {
  scene: Scene;
  itemId: string;
  x: number;
  y: number;
  scale: number; // width as a fraction of scene width
  hidden?: boolean;
  children?: ReactNode; // badges, drawn over the item
  style?: CSSProperties;
}) {
  const item = findItem(scene, itemId);
  const anchor = item?.anchor ?? "bottom";
  return (
    <div
      className="pointer-events-none absolute aspect-square select-none [-webkit-touch-callout:none]"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${scale * 100}%`,
        transform: anchorTransform(anchor),
        opacity: hidden ? 0 : 1,
        zIndex: Math.round(y * 100), // lower in the picture is nearer, so it is drawn in front
        ...style,
      }}
    >
      <GameImage src={item?.sprite ?? ""} label={item?.name ?? itemId} className="h-full w-full" />
      {children}
    </div>
  );
}
