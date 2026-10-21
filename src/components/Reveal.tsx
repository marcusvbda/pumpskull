"use client";

// Screen 9: the target next to the build, a numbered badge per item (colour plus icon, never colour alone),
// the play score and the shared Spirit Meter. The host moves on to the Culture Check.

import { useState } from "react";
import { startCulture } from "@/app/actions/culture";
import { PLAY } from "@/lib/game/config";
import { revealColour, type RevealColour } from "@/lib/game/scoring";
import type { Scene, Team } from "@/lib/game/types";
import type { Identity } from "@/lib/identity";
import type { PlayResultRow } from "@/lib/supabase/types";
import { SceneItem, SceneView } from "./SceneView";
import { TEAM_META } from "./teams";
import { Button, ErrorText, Shell } from "./ui";
import { TeamIcon } from "./UiIcon";

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
      <Shell center>
        <p className="text-center text-xl font-bold text-indigo-200">Counting the points…</p>
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
        <h1 className="text-2xl font-black text-amber-400">How close was it?</h1>
        <p className="text-sm text-indigo-100">
          <TeamIcon team={describerTeam} /> {TEAM_META[describerTeam].name} described, <TeamIcon team={builderTeam} /> {TEAM_META[builderTeam].name} built.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <section className="flex flex-col gap-0.5">
          <h2 className="text-xs font-bold">Target</h2>
          <SceneView scene={scene} backgroundId={backgroundId}>
            {items.map((it, i) => (
              <SceneItem key={i} scene={scene} itemId={it.item_id} x={it.target.x} y={it.target.y} scale={it.scale}>
                <Badge n={i + 1} score={it.score} />
              </SceneItem>
            ))}
          </SceneView>
        </section>
        <section className="flex flex-col gap-0.5">
          <h2 className="text-xs font-bold">The build</h2>
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
      </div>

      <ul className="flex flex-wrap justify-center gap-1.5 text-xs font-bold">
        {(["green", "yellow", "red"] as RevealColour[]).map((c) => (
          <li key={c} className={`rounded-full px-2.5 py-0.5 ${BADGE[c].className}`}>
            <span aria-hidden>{BADGE[c].icon}</span> {items.filter((it) => revealColour(it.score) === c).length} {BADGE[c].word}
          </li>
        ))}
      </ul>

      <p className="rounded-2xl bg-indigo-900/70 p-2 text-center text-lg font-black">
        Play score: {total.toFixed(1)} / {items.length}
      </p>

      <SpiritMeter value={spiritMeter} max={spiritMax} />

      <div className="mt-auto flex flex-col gap-1">
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
