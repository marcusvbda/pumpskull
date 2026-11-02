"use client";

// Screen 9: how the build went, in words first. One big picture that switches between the correct picture and
// the build, and a list saying how each item went (colour plus icon, never colour alone). The host moves on.

import { useState } from "react";
import { startCulture } from "@/app/actions/culture";
import { findItem } from "@/data/items";
import { DIFFICULTY, type Difficulty } from "@/lib/game/config";
import { revealColour, type RevealColour } from "@/lib/game/scoring";
import type { Scene, Team } from "@/lib/game/types";
import type { Identity } from "@/lib/identity";
import type { PlayResultItem, PlayResultRow } from "@/lib/supabase/types";
import { GameImage } from "./GameImage";
import { SceneItem, SceneView } from "./SceneView";
import { TEAM_META } from "./teams";
import { Button, ErrorText, Shell } from "./ui";

const STATUS: Record<RevealColour, { className: string; icon: string; word: string }> = {
  green: { className: "bg-green-500 text-indigo-950", icon: "✓", word: "Right spot" },
  yellow: { className: "bg-yellow-300 text-indigo-950", icon: "~", word: "Close" },
  red: { className: "bg-red-500 text-white", icon: "✗", word: "Too far" },
};

function statusOf(item: PlayResultItem) {
  const status = STATUS[revealColour(item.score)];
  return item.placed ? status : { ...status, word: "Not placed" };
}

// On the picture itself, not on the corner of its transparent box.
function Badge({ item, scene }: { item: PlayResultItem; scene: Scene }) {
  const status = statusOf(item);
  const place = findItem(scene, item.item_id)?.anchor === "center" ? "top-1/2 -translate-y-1/2" : "bottom-0";
  return (
    <span aria-hidden className={`absolute left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full text-sm font-black shadow ${place} ${status.className}`}>
      {status.icon}
    </span>
  );
}

function headline(right: number, total: number): string {
  if (total > 0 && right === total) return "Perfect build!";
  if (right / total >= 0.5) return "Great teamwork!";
  if (right > 0) return "Good try!";
  return "Tricky one!";
}

// Shared by both teams and never decides the winner, so it says so wherever it appears.
export function SpiritMeter({ value, max }: { value: number; max: number }) {
  const fill = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <section className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">
          <span aria-hidden>🕯️</span> Spirit Meter <span className="font-normal text-indigo-200">(both teams share it)</span>
        </h2>
        <span className="text-sm font-black tabular-nums">{Math.round(fill * 100)}%</span>
      </div>
      <div role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label="Spirit Meter" className="h-3 overflow-hidden rounded-full bg-indigo-950">
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
  difficulty: Difficulty;
  result: PlayResultRow | undefined;
  spiritMeter: number;
  spiritMax: number;
  refresh: () => Promise<void>;
}

export function Reveal({ identity, isHost, play, plays, scene, backgroundId, describerTeam, difficulty, result, spiritMeter, spiritMax, refresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"target" | "build">("build");

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
      <Shell center>
        <p className="text-center text-xl font-bold text-indigo-200">Counting the points…</p>
      </Shell>
    );
  }

  const { items } = result.results;
  const builderTeam: Team = describerTeam === 1 ? 2 : 1;
  const right = items.filter((it) => revealColour(it.score) === "green").length;
  const best = [...items].sort((a, b) => b.score - a.score);
  const itemScale = DIFFICULTY[difficulty].itemScale;
  const tabs = [
    { id: "build", label: `${TEAM_META[builderTeam].name}'s build` },
    { id: "target", label: "Correct picture" },
  ] as const;

  return (
    <Shell garland={false}>
      <header className="pr-[132px]">
        <p className="text-sm font-bold text-indigo-200">Play {play + 1} of {plays}</p>
        <h1 className="text-2xl leading-tight font-black text-amber-400">{headline(right, items.length)}</h1>
      </header>
      <p className="-mt-1 text-lg leading-tight font-black">
        {right} of {items.length} items in the right spot
      </p>

      <div role="tablist" aria-label="Choose a picture" className="grid grid-cols-2 gap-1 rounded-2xl bg-indigo-950 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            onClick={() => setView(tab.id)}
            className={`min-h-11 rounded-xl px-1 text-sm font-black ${view === tab.id ? "bg-amber-400 text-indigo-950" : "text-indigo-100"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <SceneView scene={scene} backgroundId={backgroundId} className="-mx-4 w-[calc(100%+2rem)] shrink-0 [@media(max-height:620px)]:mx-auto [@media(max-height:620px)]:w-2/3">
        {items.map((it, i) => {
          const position = view === "target" ? it.target : it.placed;
          return position ? (
            <SceneItem key={i} scene={scene} itemId={it.item_id} x={position.x} y={position.y} scale={itemScale}>
              <Badge item={it} scene={scene} />
            </SceneItem>
          ) : null;
        })}
      </SceneView>

      <ul aria-label="How each item went" className="grid min-h-14 flex-1 auto-rows-min grid-cols-2 gap-1.5 overflow-y-auto">
        {best.map((it, i) => {
          const status = statusOf(it);
          const name = findItem(scene, it.item_id)?.name ?? it.item_id;
          return (
            <li key={i} className="flex min-w-0 items-center gap-1.5 rounded-xl bg-indigo-900/70 p-1">
              <GameImage src={findItem(scene, it.item_id)?.sprite ?? ""} label={name} className="h-9 w-9 shrink-0" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-bold">{name}</span>
                <span className={`w-fit rounded-full px-1.5 text-xs font-black ${status.className}`}>
                  <span aria-hidden>{status.icon}</span> {status.word}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <SpiritMeter value={spiritMeter} max={spiritMax} />

      <div className="flex flex-col gap-1">
        <ErrorText>{error}</ErrorText>
        {isHost ? (
          <Button onClick={next} disabled={busy} className="w-full text-xl">
            Next: Culture Check
          </Button>
        ) : (
          <p className="rounded-2xl bg-indigo-900/70 p-3 text-center font-bold text-indigo-100">Waiting for the other phone to continue…</p>
        )}
      </div>
    </Shell>
  );
}
