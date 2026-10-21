"use client";

// Screen 12: team totals after each play and the shared Spirit Meter. Next is for the host.

import { useState } from "react";
import { nextPlay } from "@/app/actions/play";
import type { Identity } from "@/lib/identity";
import type { Team } from "@/lib/game/types";
import type { TeamScoreRow } from "@/lib/supabase/types";
import { SpiritMeter } from "./Reveal";
import { TEAM_META } from "./teams";
import { Button, ErrorText, Shell } from "./ui";

export function TeamTotals({ scores, myTeam, compact = false }: { scores: TeamScoreRow[]; myTeam: Team; compact?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5">
      {([1, 2] as Team[]).map((team) => {
        const meta = TEAM_META[team];
        const row = scores.find((s) => s.team === team);
        return (
          <li key={team} className={`flex flex-col items-center rounded-2xl border-2 text-center ${compact ? "gap-0 p-1.5" : "gap-1 p-3"} ${meta.panel} ${team === myTeam ? "ring-2 ring-white" : ""}`}>
            <span className={`flex items-center gap-1.5 text-sm font-black ${meta.title}`}>
              <span aria-hidden className={compact ? "text-xl" : "text-4xl"}>
                {meta.icon}
              </span>
              {meta.name}
            </span>
            <span className={`${compact ? "text-3xl" : "text-4xl"} font-black tabular-nums`}>{Number(row?.points ?? 0)}</span>
            {!compact && <span className="text-xs font-bold text-indigo-200">points</span>}
          </li>
        );
      })}
    </ul>
  );
}

interface Props {
  identity: Identity;
  isHost: boolean;
  team: Team;
  play: number;
  plays: number;
  scores: TeamScoreRow[]; // rows of this play
  spiritMeter: number;
  spiritMax: number;
  refresh: () => Promise<void>;
}

export function Scoreboard({ identity, isHost, team, play, plays, scores, spiritMeter, spiritMax, refresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const last = play + 1 >= plays;
  const [a, b] = [1, 2].map((t) => Number(scores.find((s) => s.team === t)?.points ?? 0));

  async function next() {
    setBusy(true);
    setError(null);
    try {
      const res = await nextPlay({ ...identity, play });
      if (!res.ok && res.error !== "play_over") setError(res.message);
      await refresh();
    } catch {
      setError("Can't reach the game. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell center>
      <header className="text-center">
        <p className="text-sm font-bold text-indigo-200">
          After play {play + 1} of {plays}
        </p>
        <h1 className="text-2xl font-black text-amber-400">Scoreboard</h1>
        <p className="text-sm text-indigo-100">{a === b ? "All tied up!" : `${TEAM_META[a > b ? 1 : 2].name} is ahead.`}</p>
      </header>

      <TeamTotals scores={scores} myTeam={team} />
      <p className="text-center text-xs text-indigo-200">The winner is decided by the Culture Check points.</p>
      <SpiritMeter value={spiritMeter} max={spiritMax} />

      <div className="flex flex-col gap-1">
        <ErrorText>{error}</ErrorText>
        {isHost ? (
          <Button onClick={next} disabled={busy} className="w-full text-xl">
            {last ? "See the final result" : "Next play"}
          </Button>
        ) : (
          <p className="rounded-2xl bg-indigo-900/70 p-3 text-center font-bold text-indigo-100">Waiting for the host…</p>
        )}
      </div>
    </Shell>
  );
}
