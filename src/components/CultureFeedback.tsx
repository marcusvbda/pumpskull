"use client";

// Screen 11: did my team get it, what was the right answer, what each team picked, and a short fun fact. The
// scoreboard follows by itself after a few seconds.

import { useEffect } from "react";
import { playSfx } from "@/lib/audio";
import { GAME } from "@/lib/game/config";
import { feedbackEndsAt } from "@/lib/game/flow";
import type { Team } from "@/lib/game/types";
import type { CultureAnswer, QuestionPublicRow, QuestionRevealRow } from "@/lib/supabase/types";
import { TEAM_META } from "./teams";
import { Shell } from "./ui";
import { TeamIcon } from "./UiIcon";

function TeamResult({ answer, mine, correct, options }: { answer: CultureAnswer; mine: boolean; correct: number; options: string[] }) {
  const meta = TEAM_META[answer.team];
  const right = answer.option === correct;
  return (
    <li className={`flex items-center gap-2 rounded-2xl border-2 p-2 ${meta.panel} ${mine ? "ring-2 ring-white" : ""}`}>
      <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-black ${right ? "bg-green-500 text-indigo-950" : "bg-red-500 text-white"}`}>
        {right ? "✓" : "✗"}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`text-sm font-black ${meta.title}`}>
          <TeamIcon team={answer.team} /> {meta.name}
          {mine ? " (you)" : ""}
        </span>
        <span className="truncate text-sm text-indigo-50">{answer.option === null ? "Did not answer" : options[answer.option]}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="text-xl font-black tabular-nums">+{answer.points}</span>
        {answer.points > GAME.correctPoints && <span className="text-xs font-black text-amber-300">⚡ fast</span>}
      </span>
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
      <Shell center>
        <p className="text-center text-xl font-bold text-indigo-200">Checking the answers…</p>
      </Shell>
    );
  }
  const leftSeconds = Math.max(0, Math.ceil((feedbackEndsAt(phaseStartedAt) - now) / 1000));
  const order = [...reveal.answers].sort((a, b) => (a.team === team ? -1 : b.team === team ? 1 : 0));
  const title = verdict === "correct" ? "Your team got it!" : mine?.option === null ? "Time's up!" : "Not quite!";

  return (
    <Shell garland={false}>
      <h1 className={`pr-[132px] text-3xl leading-tight font-black ${verdict === "correct" ? "text-green-300" : "text-amber-400"}`}>{title}</h1>
      <p className="text-base leading-snug font-bold text-indigo-100">{question.question}</p>

      <section className="rounded-2xl border-b-4 border-green-800 bg-green-500 px-4 py-2 text-indigo-950">
        <h2 className="text-xs font-black">Right answer</h2>
        <p className="text-xl leading-tight font-black">{question.options[reveal.correct]}</p>
      </section>

      <ul className="flex flex-col gap-2">
        {order.map((a) => (
          <TeamResult key={a.team} answer={a} mine={a.team === team} correct={reveal.correct} options={question.options} />
        ))}
      </ul>

      <section className="min-h-0 rounded-2xl bg-indigo-900/70 p-3">
        <h2 className="text-sm font-black text-teal-300">Did you know?</h2>
        <p className="text-base leading-snug text-indigo-50">{reveal.fact}</p>
      </section>

      <p className="text-center text-sm font-bold text-indigo-200">Scoreboard in {leftSeconds} s…</p>
    </Shell>
  );
}
