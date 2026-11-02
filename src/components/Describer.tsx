"use client";

// Screens 6A (Easy: item chips and "Try saying" hints) and 6B (Medium/Hard: picture and one hint line).

import { findItem } from "@/data/items";
import { DIFFICULTY, type Difficulty } from "@/lib/game/config";
import type { Scene, Team } from "@/lib/game/types";
import { PlayHeader } from "./PlayHeader";
import { SceneItem, SceneView } from "./SceneView";
import { Shell } from "./ui";

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
  const { showNames: easy, itemScale } = DIFFICULTY[difficulty];

  const counts = new Map<string, number>();
  for (const t of targets) counts.set(t.itemId, (counts.get(t.itemId) ?? 0) + 1);

  return (
    <Shell garland={false}>
      <PlayHeader team={team} role="describer" leftMs={leftMs} play={play} plays={plays} />

      <div className="flex flex-col gap-1.5">
        <span className="self-start rounded-full bg-pink-500 px-3 py-1 text-xs font-black text-white">
          <span aria-hidden>👁️</span> Only your team can see this
        </span>
        <SceneView scene={scene} backgroundId={backgroundId} className="-mx-4 w-[calc(100%+2rem)] border-y-4 border-amber-400">
          {targets.map((t, i) => (
            <SceneItem key={i} scene={scene} itemId={t.itemId} x={t.x} y={t.y} scale={itemScale} />
          ))}
        </SceneView>
      </div>

      {easy ? (
        <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-1.5">
          <section className="flex flex-col gap-1">
            <h2 className="text-base font-bold">Items in the picture</h2>
            <ul className="flex flex-wrap gap-1.5">
              {[...counts].map(([itemId, count]) => (
                <li key={itemId} className="rounded-full bg-indigo-800 px-3 py-1 text-sm font-bold">
                  {findItem(scene, itemId)?.name ?? itemId}
                  {count > 1 && <span className="ml-1 rounded-full bg-amber-400 px-1.5 text-indigo-950">×{count}</span>}
                </li>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-1">
            <h2 className="text-base font-bold">Try saying</h2>
            <ul className="flex flex-wrap gap-1.5">
              {PHRASES.map((p) => (
                <li key={p} className="rounded-full border-2 border-teal-400 bg-indigo-950/80 px-3 py-0.5 text-sm font-bold text-teal-200">
                  “{p}”
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <p className="rounded-2xl bg-indigo-900/70 p-3 text-center text-base font-bold text-indigo-100">
          Describe it in English. The other team can&apos;t see this.
        </p>
      )}
    </Shell>
  );
}
