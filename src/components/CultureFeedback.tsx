"use client";

// Screen 11: the right answer, how each team did (points and time) and a short fun fact. The scoreboard
// follows by itself after a few seconds.

import { useEffect } from "react";
import { playSfx } from "@/lib/audio";
import { GAME } from "@/lib/game/config";
import { feedbackEndsAt } from "@/lib/game/flow";
import type { Team } from "@/lib/game/types";
import type { CultureAnswer, QuestionPublicRow, QuestionRevealRow } from "@/lib/supabase/types";
import { TEAM_META } from "./teams";
import { Shell } from "./ui";

const SHAPES = ["▲", "◆", "●", "■"];

function TeamResult({ answer, mine, correct }: { answer: CultureAnswer; mine: boolean; correct: number }) {
  const meta = TEAM_META[answer.team];
  const right = answer.option === correct;
  const verdict = answer.option === null ? { icon: "…", text: "No answer" } : right ? { icon: "✓", text: "Correct!" } : { icon: "✗", text: "Not quite" };
  return (
    <li className={`flex flex-col gap-1 rounded-2xl border-2 p-3 ${meta.panel} ${mine ? "ring-2 ring-white" : ""}`}>
      <span className={`text-sm font-black ${meta.title}`}>
        <span aria-hidden>{meta.icon}</span> {meta.name}
        {mine ? " (you)" : ""}
      </span>
      <span className={`text-lg font-black ${right ? "text-green-300" : "text-red-300"}`}>
        <span aria-hidden>{verdict.icon}</span> {verdict.text}
      </span>
      <span className="text-sm font-bold text-indigo-100">
        {answer.points > 0 ? `+${answer.points} points` : "0 points"}
        {answer.option !== null ? ` · ${(answer.ms / 1000).toFixed(1)} s` : ""}
      </span>
      {answer.points > GAME.correctPoints ? <span className="text-xs font-black text-amber-300">⚡ fast bonus</span> : null}
    </li>
  );
}

interface Props {
  team: Team;
  question: QuestionPublicRow | undefined;
  reveal: QuestionRevealRow | undefined;
  phaseStartedAt: string;
  now: number;
}

export function CultureFeedback({ team, question, reveal, phaseStartedAt, now }: Props) {
  // One sound when the answer appears: yes for a right answer, a low note for a wrong or missing one.
  const mine = reveal?.answers.find((a) => a.team === team);
  const verdict = reveal ? (mine?.option === reveal.correct ? "correct" : "wrong") : null;
  const playIdx = reveal?.play_idx;
  useEffect(() => {
    if (verdict) playSfx(verdict);
  }, [verdict, playIdx]);

  if (!question || !reveal) {
    return (
      <Shell>
        <p className="pt-16 text-center text-xl font-bold text-indigo-200">Checking the answers…</p>
      </Shell>
    );
  }
  const leftSeconds = Math.max(0, Math.ceil((feedbackEndsAt(phaseStartedAt) - now) / 1000));
  const order = [...reveal.answers].sort((a, b) => (a.team === team ? -1 : b.team === team ? 1 : 0));

  return (
    <Shell>
      <h1 className="text-center text-3xl font-black text-amber-400">The answer</h1>
      <p className="rounded-2xl bg-indigo-900/70 p-3 text-center text-lg font-black">{question.question}</p>
      <p className="flex items-center gap-3 rounded-2xl border-b-4 border-green-800 bg-green-500 px-4 py-3 text-lg font-extrabold text-indigo-950">
        <span aria-hidden className="text-2xl">
          {SHAPES[reveal.correct]}
        </span>
        <span className="min-w-0 flex-1">{question.options[reveal.correct]}</span>
        <span aria-hidden>✓</span>
      </p>

      <ul className="grid grid-cols-2 gap-2.5">
        {order.map((a) => (
          <TeamResult key={a.team} answer={a} mine={a.team === team} correct={reveal.correct} />
        ))}
      </ul>

      <section className="rounded-2xl bg-indigo-900/70 p-3">
        <h2 className="text-sm font-black text-teal-300">Did you know?</h2>
        <p className="text-base text-indigo-50">{reveal.fact}</p>
      </section>

      <p className="mt-auto text-center text-sm font-bold text-indigo-200">Scoreboard in {leftSeconds} s…</p>
    </Shell>
  );
}
