"use client";

// A scene background with items on it, at the 16:10 ratio of every scene file. Item positions are the
// anchor point in scene fractions (bottom-centre for things on a surface, centre for wall items).

import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, Ref } from "react";
import { backgroundSrc } from "@/data/backgrounds";
import { findItem } from "@/data/items";
import type { Anchor, Scene } from "@/lib/game/types";
import { GameImage } from "./GameImage";

export function anchorTransform(anchor: Anchor): string {
  return anchor === "bottom" ? "translate(-50%, -100%)" : "translate(-50%, -50%)";
}

export function SceneView({
  scene,
  backgroundId,
  children,
  sceneRef,
  className = "",
}: {
  scene: Scene;
  backgroundId: string;
  children?: ReactNode;
  sceneRef?: Ref<HTMLDivElement>;
  className?: string;
}) {
  return (
    <div ref={sceneRef} className={`relative w-full overflow-hidden rounded-xl ${className}`} style={{ aspectRatio: "16 / 10" }}>
      <GameImage src={backgroundSrc({ scene, id: backgroundId })} label={backgroundId} variant="scene" className="absolute inset-0 h-full w-full" />
      {children}
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
  onPointerDown,
  children,
  style,
}: {
  scene: Scene;
  itemId: string;
  x: number;
  y: number;
  scale: number; // width as a fraction of scene width
  hidden?: boolean;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  children?: ReactNode; // badges, drawn over the item
  style?: CSSProperties;
}) {
  const item = findItem(scene, itemId);
  const anchor = item?.anchor ?? "bottom";
  return (
    <div
      onPointerDown={onPointerDown}
      className={`absolute aspect-square select-none [-webkit-touch-callout:none] ${onPointerDown ? "cursor-grab touch-none" : "pointer-events-none"}`}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${scale * 100}%`,
        transform: anchorTransform(anchor),
        opacity: hidden ? 0 : 1,
        ...style,
      }}
    >
      <GameImage src={item?.sprite ?? ""} label={item?.name ?? itemId} className="h-full w-full" />
      {children}
    </div>
  );
}
