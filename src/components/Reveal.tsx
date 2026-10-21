"use client";

// Screen 9: the target next to the build, a numbered badge per item (colour plus icon, never colour alone),
// the play score and the shared Spirit Meter. The host moves on to the Culture Check.

import { useState } from "react";
import { startCulture } from "@/app/actions/culture";
import { findItem } from "@/data/items";
import { PLAY } from "@/lib/game/config";
import { revealColour, type RevealColour } from "@/lib/game/scoring";
import type { Scene, Team } from "@/lib/game/types";
import type { Identity } from "@/lib/identity";
import type { PlayResultRow } from "@/lib/supabase/types";
import { SceneItem, SceneView } from "./SceneView";
import { TEAM_META } from "./teams";
import { Button, ErrorText, Shell } from "./ui";

const BADGE: Record<RevealColour, { className: string; icon: string; word: string }> = {
  green: { className: "bg-green-500 text-indigo-950", icon: "✓", word: "spot on" },
  yellow: { className: "bg-yellow-300 text-indigo-950", icon: "~", word: "close" },
  red: { className: "bg-red-500 text-white", icon: "✗", word: "far" },
};

function Badge({ n, score }: { n: number; score: number }) {
  const b = BADGE[revealColour(score)];
  return (
    <span className={`absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full px-1 text-[11px] font-black shadow ${b.className}`}>
      {n}
      <span aria-hidden>{b.icon}</span>
    </span>
  );
}

export function SpiritMeter({ value, max }: { value: number; max: number }) {
  const fill = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">
          <span aria-hidden>🕯️</span> Spirit Meter
        </h2>
        <span className="text-sm font-bold text-indigo-200">
          {value.toFixed(1)} / {max}
        </span>
      </div>
      <div role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label="Spirit Meter" className="h-5 overflow-hidden rounded-full bg-indigo-950">
        <div className="h-full rounded-full bg-gradient-to-r from-pink-500 via-amber-400 to-teal-400" style={{ width: `${fill * 100}%` }} />
      </div>
    </section>
  );
}

interface Props {
  identity: Identity;
  isHost: boolean;
  play: number;
  plays: number;
  scene: Scene;
  backgroundId: string;
  describerTeam: Team;
  result: PlayResultRow | undefined;
  spiritMeter: number;
  spiritMax: number;
  refresh: () => Promise<void>;
}

export function Reveal({ identity, isHost, play, plays, scene, backgroundId, describerTeam, result, spiritMeter, spiritMax, refresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function next() {
    setBusy(true);
    setError(null);
    try {
      const res = await startCulture({ ...identity, play });
      if (!res.ok && res.error !== "play_over") setError(res.message);
      await refresh();
    } catch {
      setError("Can't reach the game. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!result) {
    return (
      <Shell>
        <p className="pt-16 text-center text-xl font-bold text-indigo-200">Counting the points…</p>
      </Shell>
    );
  }

  const { items, total } = result.results;
  const builderTeam: Team = describerTeam === 1 ? 2 : 1;

  return (
    <Shell>
      <header className="text-center">
        <p className="text-sm font-bold text-indigo-200">
          Play {play + 1} of {plays}
        </p>
        <h1 className="text-3xl font-black text-amber-400">How close was it?</h1>
        <p className="text-sm text-indigo-100">
          {TEAM_META[describerTeam].icon} {TEAM_META[describerTeam].name} described, {TEAM_META[builderTeam].icon} {TEAM_META[builderTeam].name} built.
        </p>
      </header>

      <section className="flex flex-col gap-1">
        <h2 className="text-sm font-bold">Target</h2>
        <SceneView scene={scene} backgroundId={backgroundId}>
          {items.map((it, i) => (
            <SceneItem key={i} scene={scene} itemId={it.item_id} x={it.target.x} y={it.target.y} scale={it.scale}>
              <Badge n={i + 1} score={it.score} />
            </SceneItem>
          ))}
        </SceneView>
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="text-sm font-bold">The build</h2>
        <SceneView scene={scene} backgroundId={backgroundId}>
          {items.map((it, i) =>
            it.placed ? (
              <SceneItem key={i} scene={scene} itemId={it.item_id} x={it.placed.x} y={it.placed.y} scale={PLAY.builderItemScale}>
                <Badge n={i + 1} score={it.score} />
              </SceneItem>
            ) : null,
          )}
        </SceneView>
      </section>

      <ul className="grid grid-cols-2 gap-1.5 text-sm">
        {items.map((it, i) => {
          const b = BADGE[revealColour(it.score)];
          return (
            <li key={i} className="flex items-center gap-1.5 rounded-xl bg-indigo-900/70 px-2 py-1">
              <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-black ${b.className}`}>
                {i + 1}
                <span aria-hidden>{b.icon}</span>
              </span>
              <span className="min-w-0 flex-1 truncate font-bold">{findItem(scene, it.item_id)?.name ?? it.item_id}</span>
              <span className="text-xs text-indigo-200">{it.placed ? b.word : "not placed"}</span>
            </li>
          );
        })}
      </ul>

      <p className="rounded-2xl bg-indigo-900/70 p-3 text-center text-lg font-black">
        Play score: {total.toFixed(1)} / {items.length}
      </p>

      <SpiritMeter value={spiritMeter} max={spiritMax} />

      <div className="mt-auto flex flex-col gap-2">
        <ErrorText>{error}</ErrorText>
        {isHost ? (
          <Button onClick={next} disabled={busy} className="w-full text-xl">
            Culture Check
          </Button>
        ) : (
          <p className="rounded-2xl bg-indigo-900/70 p-3 text-center font-bold text-indigo-100">Waiting for the host…</p>
        )}
      </div>
    </Shell>
  );
}
