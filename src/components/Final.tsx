"use client";

// Screen 13: winner (or draw), final totals, total Spirit Meter, the five comparison cards and Play again.

import Link from "next/link";
import { useState } from "react";
import { playAgain } from "@/app/actions/room";
import { COMPARE_CARDS } from "@/data/compareCards";
import { decideWinner } from "@/lib/game/culture";
import type { Team } from "@/lib/game/types";
import type { Identity } from "@/lib/identity";
import type { TeamScoreRow } from "@/lib/supabase/types";
import { SpiritMeter } from "./Reveal";
import { TeamTotals } from "./Scoreboard";
import { TEAM_META } from "./teams";
import { Button, ErrorText, Shell } from "./ui";
import { TeamIcon } from "./UiIcon";

interface Props {
  identity: Identity;
  isHost: boolean;
  team: Team;
  scores: TeamScoreRow[]; // rows of the last play
  spiritMeter: number;
  spiritMax: number;
  refresh: () => Promise<void>;
}

export function Final({ identity, isHost, team, scores, spiritMeter, spiritMax, refresh }: Props) {
  const [cardIndex, setCardIndex] = useState(0);
  const card = COMPARE_CARDS[cardIndex];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tally = (t: Team) => {
    const row = scores.find((s) => s.team === t);
    return { points: Number(row?.points ?? 0), totalMs: Number(row?.total_ms ?? 0) };
  };
  const winner = decideWinner(tally(1), tally(2));
  const tied = tally(1).points === tally(2).points;

  async function again() {
    setBusy(true);
    setError(null);
    try {
      const res = await playAgain(identity);
      if (!res.ok) setError(res.message);
      await refresh();
    } catch {
      setError("Can't reach the game. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <header className={`flex items-center gap-3 rounded-3xl border-4 p-2 text-left ${winner ? TEAM_META[winner].panel : "border-teal-300/70 bg-teal-300/10"}`}>
        <span aria-hidden className="text-4xl leading-none">
          {winner ? <TeamIcon team={winner} className="h-14 w-14" /> : "🤝"}
        </span>
        <div className="min-w-0">
        <h1 className="text-xl font-black text-amber-400">{winner ? `${TEAM_META[winner].name} wins!` : "It's a draw!"}</h1>
        <p className="text-xs text-indigo-100">
          {winner === null
            ? "Same points and same speed. Great game, both teams!"
            : tied
              ? "Same points, but faster answers decided it."
              : winner === team
                ? "Your team knows its culture. Well done!"
                : "Good game! Next time it could be you."}
        </p>
        </div>
      </header>

      <TeamTotals scores={scores} myTeam={team} compact />
      <SpiritMeter value={spiritMeter} max={spiritMax} />

      <section className="flex min-h-0 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="min-w-0 truncate text-base font-black text-amber-400">Day of the Dead vs Halloween</h2>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" aria-label="Previous card" disabled={cardIndex === 0} onClick={() => setCardIndex(cardIndex - 1)} className="h-9 w-9 rounded-full bg-indigo-700 font-black disabled:opacity-35">
              ‹
            </button>
            <span className="text-xs font-bold tabular-nums">
              {cardIndex + 1}/{COMPARE_CARDS.length}
            </span>
            <button type="button" aria-label="Next card" disabled={cardIndex === COMPARE_CARDS.length - 1} onClick={() => setCardIndex(cardIndex + 1)} className="h-9 w-9 rounded-full bg-indigo-700 font-black disabled:opacity-35">
              ›
            </button>
          </div>
        </div>
        <article className="flex min-h-0 flex-col gap-1 rounded-2xl bg-indigo-900/70 p-2">
          <h3 className="font-black">
            <span aria-hidden>{card.icon}</span> {card.title}
          </h3>
          <div className="grid grid-cols-2 gap-1.5 text-sm leading-snug [@media(max-height:620px)]:text-xs">
            <p className={`rounded-xl border p-1.5 ${TEAM_META[1].panel}`}>
              <span className={`block text-xs font-black ${TEAM_META[1].title}`}>
                <TeamIcon team={1} /> Day of the Dead
              </span>
              {card.dod}
            </p>
            <p className={`rounded-xl border p-1.5 ${TEAM_META[2].panel}`}>
              <span className={`block text-xs font-black ${TEAM_META[2].title}`}>
                <TeamIcon team={2} /> Halloween
              </span>
              {card.halloween}
            </p>
          </div>
        </article>
      </section>

      <div className="flex flex-col gap-1">
        <ErrorText>{error}</ErrorText>
        {isHost ? (
          <Button onClick={again} disabled={busy} className="w-full text-xl">
            Play again
          </Button>
        ) : (
          <p className="rounded-2xl bg-indigo-900/70 p-3 text-center font-bold text-indigo-100">The host can start a new game.</p>
        )}
        <Link href="/" className="flex min-h-10 items-center justify-center rounded-2xl border-b-4 border-indigo-900 bg-indigo-600 px-6 text-base font-extrabold">
          Home
        </Link>
      </div>
    </Shell>
  );
}
