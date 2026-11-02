"use client";

// Screen 12: who is ahead, each team's points (Culture Check + build, added up) and what every play was worth.
// Next is for the host.

import { useState } from "react";
import { nextPlay } from "@/app/actions/play";
import { GAME } from "@/lib/game/config";
import { buildPoints, formatPoints } from "@/lib/game/scoring";
import type { Identity } from "@/lib/identity";
import type { Team } from "@/lib/game/types";
import type { PlayResultRow, QuestionRevealRow, TeamScoreRow } from "@/lib/supabase/types";
import { TEAM_META } from "./teams";
import { Button, ErrorText, Shell } from "./ui";
import { TeamIcon } from "./UiIcon";

// Build points of one play, the same for both teams. Only plays whose Culture Check is done count, like the totals.
function buildOf(playResults: PlayResultRow[], playIdx: number): number {
  return buildPoints(Number(playResults.find((r) => r.play_idx === playIdx)?.spirit_gain ?? 0));
}

// What a team's total is made of: its Culture Check answers and the build points of every finished play.
function partsOf(team: Team, reveals: QuestionRevealRow[], playResults: PlayResultRow[]) {
  const quiz = reveals.reduce((sum, r) => sum + (r.answers.find((a) => a.team === team)?.points ?? 0), 0);
  const build = reveals.reduce((sum, r) => sum + buildOf(playResults, r.play_idx), 0);
  return { quiz, build };
}

interface TotalsProps {
  scores: TeamScoreRow[];
  myTeam: Team;
  compact?: boolean;
  reveals?: QuestionRevealRow[]; // with playResults: shows "Quiz + Build" under each total
  playResults?: PlayResultRow[];
}

export function TeamTotals({ scores, myTeam, compact = false, reveals, playResults }: TotalsProps) {
  return (
    <ul className="grid grid-cols-2 gap-2.5">
      {([1, 2] as Team[]).map((team) => {
        const meta = TEAM_META[team];
        const row = scores.find((s) => s.team === team);
        const parts = reveals && playResults ? partsOf(team, reveals, playResults) : null;
        return (
          <li key={team} className={`flex flex-col items-center rounded-2xl border-2 text-center ${compact ? "gap-0 p-1.5" : "gap-1 p-3"} ${meta.panel} ${team === myTeam ? "ring-2 ring-white" : ""}`}>
            <span className={`flex items-center gap-1.5 text-sm font-black ${meta.title}`}>
              <TeamIcon team={team} className={compact ? "h-6 w-6" : "h-10 w-10"} />
              {meta.name}
            </span>
            <span className={`${compact ? "text-3xl" : "text-5xl"} font-black tabular-nums`}>{formatPoints(Number(row?.points ?? 0))}</span>
            <span className="text-xs font-bold text-indigo-200">{team === myTeam ? "points (you)" : "points"}</span>
            {parts && (
              <span className="text-xs font-bold text-indigo-100 tabular-nums">
                Quiz {formatPoints(parts.quiz)} + Build {formatPoints(parts.build)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// One column per play of the game. Build row: the build points of the play (both teams get them). One row per
// team: its Culture Check answer, with the icon and the points it earned. Adding a column up gives the play's worth.
export function PointsTable({ reveals, playResults, plays }: { reveals: QuestionRevealRow[]; playResults: PlayResultRow[]; plays: number }) {
  const columns = Array.from({ length: plays }, (_, i) => i);
  return (
    <section aria-label="Points so far" className="rounded-2xl bg-indigo-900/70 p-2">
      <table className="w-full table-fixed text-center font-black">
        <thead>
          <tr className="text-xs text-indigo-200">
            <th scope="col" className="w-14 text-left font-bold">
              Play
            </th>
            {columns.map((c) => (
              <th key={c} scope="col" className="font-bold">
                {c + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="py-0.5 text-left text-xs font-bold text-amber-300">
              Build
            </th>
            {columns.map((c) => (
              <td key={c} className="text-sm tabular-nums text-amber-300">
                {reveals.some((r) => r.play_idx === c) ? formatPoints(buildOf(playResults, c)) : <span className="text-indigo-400">·</span>}
              </td>
            ))}
          </tr>
          {([1, 2] as Team[]).map((team) => (
            <tr key={team}>
              <th scope="row" className="py-0.5 text-left">
                <TeamIcon team={team} className="h-6 w-6" />
                <span className="sr-only">{TEAM_META[team].name} quiz</span>
              </th>
              {columns.map((c) => {
                const reveal = reveals.find((r) => r.play_idx === c);
                const answer = reveal?.answers.find((a) => a.team === team);
                if (!reveal || !answer) return <td key={c} className="text-indigo-400">·</td>;
                const right = answer.option === reveal.correct;
                const fast = answer.points > GAME.correctPoints;
                return (
                  <td key={c} className={right ? "text-green-300" : "text-red-300"}>
                    <span className="block text-base leading-none">{fast ? "⚡" : right ? "✓" : "✗"}</span>
                    <span className="block text-[11px] leading-tight tabular-nums">{formatPoints(answer.points)}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-center text-xs font-bold text-indigo-200">
        Build: item scores added up, same for both teams · Quiz: ✓ +{GAME.correctPoints} · ⚡ fast +{GAME.correctPoints + GAME.fastBonus} · ✗ 0
      </p>
    </section>
  );
}

interface Props {
  identity: Identity;
  isHost: boolean;
  team: Team;
  play: number;
  plays: number;
  scores: TeamScoreRow[]; // rows of this play
  reveals: QuestionRevealRow[];
  playResults: PlayResultRow[];
  refresh: () => Promise<void>;
}

export function Scoreboard({ identity, isHost, team, play, plays, scores, reveals, playResults, refresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const last = play + 1 >= plays;
  const [a, b] = [1, 2].map((t) => Number(scores.find((s) => s.team === t)?.points ?? 0));
  const leader: Team | null = a === b ? null : a > b ? 1 : 2;
  const title = leader === null ? "It's a tie!" : leader === team ? "Your team is winning!" : `${TEAM_META[leader].name} is winning!`;

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
    <Shell center garland={false}>
      <header className="pr-[132px]">
        <p className="text-sm font-bold text-indigo-200">
          Play {play + 1} of {plays} done
        </p>
        <h1 className="text-2xl leading-tight font-black text-amber-400">{title}</h1>
      </header>

      <TeamTotals scores={scores} myTeam={team} reveals={reveals} playResults={playResults} />
      <PointsTable reveals={reveals} playResults={playResults} plays={plays} />
      <p className="text-center text-sm font-bold text-indigo-100">The team with the most points at the end wins.</p>

      <div className="flex flex-col gap-1">
        <ErrorText>{error}</ErrorText>
        {isHost ? (
          <Button onClick={next} disabled={busy} className="w-full text-xl">
            {last ? "See who won" : "Next play"}
          </Button>
        ) : (
          <p className="rounded-2xl bg-indigo-900/70 p-3 text-center font-bold text-indigo-100">Waiting for the other phone to continue…</p>
        )}
      </div>
    </Shell>
  );
}
