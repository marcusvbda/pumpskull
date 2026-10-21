"use client";

// Screens 6A (Easy: item chips and "Try saying" hints) and 6B (Medium/Hard: picture and one hint line).
// Big zoom turns the picture sideways to fill the screen, so the whole team around the phone can see it.

import { useState } from "react";
import { findItem } from "@/data/items";
import { DIFFICULTY, type Difficulty } from "@/lib/game/config";
import type { Scene, Team } from "@/lib/game/types";
import { PlayHeader } from "./PlayHeader";
import { SceneItem, SceneView } from "./SceneView";
import { Button, Shell } from "./ui";

const PHRASES = ["on top of", "next to", "under", "between", "on the left", "on the right", "in the middle", "in front of"];

interface Props {
  scene: Scene;
  backgroundId: string;
  targets: { itemId: string; x: number; y: number; scale: number }[];
  difficulty: Difficulty;
  team: Team;
  leftMs: number;
  play: number;
  plays: number;
}

export function Describer({ scene, backgroundId, targets, difficulty, team, leftMs, play, plays }: Props) {
  const [zoom, setZoom] = useState(false);
  const easy = DIFFICULTY[difficulty].showNames;

  const counts = new Map<string, number>();
  for (const t of targets) counts.set(t.itemId, (counts.get(t.itemId) ?? 0) + 1);

  const picture = (
    <SceneView scene={scene} backgroundId={backgroundId}>
      {targets.map((t, i) => (
        <SceneItem key={i} scene={scene} itemId={t.itemId} x={t.x} y={t.y} scale={t.scale} />
      ))}
    </SceneView>
  );

  return (
    <Shell>
      <PlayHeader team={team} role="describer" leftMs={leftMs} play={play} plays={plays} />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-pink-500 px-3 py-1 text-xs font-black text-white">
            <span aria-hidden>👁️</span> Only your team can see this
          </span>
          <Button variant="secondary" onClick={() => setZoom(true)} className="min-h-9 shrink-0 px-3 py-0 text-sm">
            <span aria-hidden>🔍</span> Big
          </Button>
        </div>
        <button type="button" onClick={() => setZoom(true)} aria-label="Show the picture bigger" className="block w-full rounded-xl border-4 border-amber-400">
          {picture}
        </button>
      </div>

      {easy ? (
        <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-1.5">
          <section className="flex flex-col gap-1">
            <h2 className="text-sm font-bold">Items in the picture</h2>
            <ul className="flex flex-wrap gap-1.5">
              {[...counts].map(([itemId, count]) => (
                <li key={itemId} className="rounded-full bg-indigo-800 px-2.5 py-0.5 text-xs font-bold">
                  {findItem(scene, itemId)?.name ?? itemId}
                  {count > 1 && <span className="ml-1 rounded-full bg-amber-400 px-1.5 text-indigo-950">×{count}</span>}
                </li>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-1">
            <h2 className="text-sm font-bold">Try saying</h2>
            <ul className="flex flex-wrap gap-1.5">
              {PHRASES.map((p) => (
                <li key={p} className="rounded-full border-2 border-teal-400 px-2.5 py-0 text-xs font-bold text-teal-200">
                  “{p}”
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <p className="rounded-2xl bg-indigo-900/70 p-2 text-center text-sm font-bold text-indigo-100">
          Describe it in English. The other team can&apos;t see this.
        </p>
      )}

      {zoom && (
        <button
          type="button"
          onClick={() => setZoom(false)}
          aria-label="Close the big picture"
          className="fixed inset-0 z-50 bg-indigo-950"
        >
          <div
            className="absolute top-1/2 left-1/2"
            style={{ width: "min(100dvh, 160vw)", transform: "translate(-50%, -50%) rotate(90deg)" }}
          >
            {picture}
          </div>
          <span className="absolute right-3 bottom-3 rounded-full bg-indigo-800 px-3 py-2 text-sm font-bold">Tap to close</span>
        </button>
      )}
    </Shell>
  );
}
