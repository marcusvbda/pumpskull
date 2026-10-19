"use client";

// Dev tool: preview generated layouts on the placeholder slot files. Not linked from the game.

import { useMemo, useState } from "react";
import { GameImage } from "@/components/GameImage";
import { BACKGROUNDS, backgroundSrc } from "@/data/backgrounds";
import { findItem } from "@/data/items";
import { DIFFICULTY, type Difficulty } from "@/lib/game/config";
import { generateLayout } from "@/lib/game/layout";

export default function LayoutPreview() {
  const [bgId, setBgId] = useState(BACKGROUNDS[0].id);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [seed, setSeed] = useState("demo");
  const [showSlots, setShowSlots] = useState(true);

  const bg = BACKGROUNDS.find((b) => b.id === bgId)!;
  const result = useMemo(() => {
    try {
      return { layout: generateLayout(bg, difficulty, seed) };
    } catch (e) {
      return { error: String(e) };
    }
  }, [bg, difficulty, seed]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-3 p-4 text-sm text-white">
      <h1 className="text-lg font-bold">Layout preview</h1>
      <div className="grid grid-cols-2 gap-2">
        <select className="rounded bg-indigo-900 p-2" value={bgId} onChange={(e) => setBgId(e.target.value)}>
          {BACKGROUNDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.id}
              {b.placeholder ? " (placeholder slots)" : ""}
            </option>
          ))}
        </select>
        <select className="rounded bg-indigo-900 p-2" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
          {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY[d].label}
            </option>
          ))}
        </select>
        <input className="rounded bg-indigo-900 p-2" value={seed} onChange={(e) => setSeed(e.target.value)} aria-label="Seed" />
        <button className="rounded bg-amber-500 p-2 font-bold text-indigo-950" onClick={() => setSeed(Math.random().toString(36).slice(2, 8))}>
          New seed
        </button>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={showSlots} onChange={(e) => setShowSlots(e.target.checked)} /> Show all slots
      </label>

      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 10" }}>
        <GameImage src={backgroundSrc(bg)} label={`${bg.id} (no image yet)`} variant="scene" className="absolute inset-0 h-full w-full" />
        {showSlots &&
          bg.slots.map((s) => (
            <div
              key={s.id}
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50"
              style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
              title={`${s.id} ${s.type}`}
            />
          ))}
        {"layout" in result &&
          result.layout!.targets.map((t, i) => {
            const item = findItem(bg.scene, t.itemId)!;
            const size = `${t.scale * 100}%`;
            // Anchor: bottom-centre sits on the slot, centre is centred on it.
            const translate = item.anchor === "bottom" ? "-translate-x-1/2 -translate-y-full" : "-translate-x-1/2 -translate-y-1/2";
            return (
              <GameImage
                key={i}
                src={item.sprite}
                label={item.name}
                className={`absolute aspect-square ${translate}`}
                style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%`, width: size }}
              />
            );
          })}
      </div>

      {"error" in result ? (
        <p className="text-red-400">{result.error}</p>
      ) : (
        <div>
          <p>
            Targets: {result.layout!.targets.map((t) => `${t.itemId}@${t.slotId}`).join(", ")}
          </p>
          <p>Decoys: {result.layout!.decoys.join(", ")}</p>
        </div>
      )}
    </main>
  );
}
