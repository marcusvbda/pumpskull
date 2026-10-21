"use client";

// Screen 10: one question, 4 colour buttons with shapes, a 20 s ring and the +0.5 fast badge for the first
// 8 seconds. One answer per team phone. The time shown comes from the server clock; the server scores it.

import { useState } from "react";
import { submitAnswer } from "@/app/actions/culture";
import { playSfx } from "@/lib/audio";
import { GAME } from "@/lib/game/config";
import type { Team } from "@/lib/game/types";
import type { Identity } from "@/lib/identity";
import type { QuestionPublicRow } from "@/lib/supabase/types";
import { TEAM_META } from "./teams";
import { ErrorText, Shell } from "./ui";

// Colour is never the only signal: every answer also has its own shape.
const ANSWERS = [
  { shape: "▲", name: "triangle", className: "bg-red-500 border-red-800 text-white" },
  { shape: "◆", name: "diamond", className: "bg-sky-500 border-sky-800 text-white" },
  { shape: "●", name: "circle", className: "bg-yellow-300 border-yellow-600 text-indigo-950" },
  { shape: "■", name: "square", className: "bg-green-500 border-green-800 text-indigo-950" },
] as const;

export function Ring({ leftMs, totalMs, urgent }: { leftMs: number; totalMs: number; urgent?: boolean }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const fraction = Math.min(1, Math.max(0, leftMs / totalMs));
  const seconds = Math.max(0, Math.ceil(leftMs / 1000));
  return (
    <div role="timer" aria-label={`${seconds} seconds left`} className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" className="stroke-indigo-950" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className={urgent ? "stroke-red-400" : "stroke-amber-400"}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-black tabular-nums">{seconds}</span>
    </div>
  );
}

interface Props {
  identity: Identity;
  team: Team;
  play: number;
  plays: number;
  question: QuestionPublicRow | undefined;
  startedAt: number; // phase_started_at, server time
  now: number; // server time
}

export function Culture({ identity, team, play, plays, question, startedAt, now }: Props) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [locked, setLocked] = useState(false); // this team already answered (maybe before a reload)
  const [error, setError] = useState<string | null>(null);
  const meta = TEAM_META[team];

  if (!question) {
    return (
      <Shell center>
        <p className="text-center text-xl font-bold text-indigo-200">Getting the question…</p>
      </Shell>
    );
  }

  const totalMs = GAME.cultureSeconds * 1000;
  const leftMs = startedAt + totalMs - now;
  const fast = now - startedAt < GAME.cultureFastSeconds * 1000;
  const over = leftMs <= 0;
  const done = chosen !== null || locked;

  async function answer(option: number) {
    if (done || over) return;
    setChosen(option);
    setError(null);
    playSfx("click");
    try {
      const res = await submitAnswer({ ...identity, play, option });
      if (!res.ok) {
        if (res.error === "play_over") return; // too late: the feedback screen comes next
        setChosen(null);
        setError(res.message);
      } else if (res.already) {
        setLocked(true);
        setChosen(null);
      }
    } catch {
      setChosen(null);
      setError("Can't reach the game. Tap your answer again.");
    }
  }

  return (
    <Shell>
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className={`truncate text-sm font-black ${meta.title}`}>
            <span aria-hidden>{meta.icon}</span> {meta.name}
          </span>
          <span className="text-xs font-bold text-indigo-200">
            Culture Check · Play {play + 1} of {plays}
          </span>
        </div>
        <Ring leftMs={leftMs} totalMs={totalMs} urgent={leftMs <= 5000} />
      </header>

      {fast && !done && !over ? (
        <p className="self-center rounded-full bg-amber-400 px-3 py-0.5 text-sm font-black text-indigo-950">
          <span aria-hidden>⚡</span> +0.5 if you answer fast
        </p>
      ) : (
        <span className="h-6" aria-hidden />
      )}

      <h1 className="rounded-2xl bg-indigo-900/70 p-3 text-center text-lg leading-snug font-black">{question.question}</h1>

      <div className="grid min-h-0 flex-1 grid-cols-1 auto-rows-fr gap-2">
        {question.options.map((text, i) => {
          const a = ANSWERS[i];
          const mine = chosen === i;
          return (
            <button
              key={i}
              type="button"
              disabled={done || over}
              onClick={() => answer(i)}
              aria-label={`${a.name}: ${text}`}
              className={`flex min-h-12 items-center gap-3 rounded-2xl border-b-4 px-4 py-1 text-left text-base leading-tight font-extrabold transition-transform enabled:active:translate-y-0.5 enabled:active:border-b-2 disabled:cursor-not-allowed ${a.className} ${
                done && !mine ? "opacity-40" : ""
              } ${mine ? "ring-4 ring-white" : ""}`}
            >
              <span aria-hidden className="w-7 text-center text-2xl">
                {a.shape}
              </span>
              <span className="min-w-0 flex-1">{text}</span>
              {mine ? <span aria-hidden>✓</span> : null}
            </button>
          );
        })}
      </div>

      <ErrorText>{error}</ErrorText>
      <p className="rounded-2xl bg-indigo-900/70 p-2 text-center text-sm font-bold text-indigo-100">
        {done
          ? "Answer locked in. Waiting for the other team…"
          : over
            ? "Time is up!"
            : "Talk with your team, then tap one answer."}
      </p>
    </Shell>
  );
}
