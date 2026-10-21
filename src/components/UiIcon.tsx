"use client";

// Small art from public/ui/ (team badges, difficulty candies). If the file is missing the emoji shows instead,
// so a missing image never leaves a hole. Decoration only: the name always sits next to it.

import { useState } from "react";
import type { Team } from "@/lib/game/types";
import { TEAM_META } from "./teams";

export function UiIcon({ name, fallback, className = "" }: { name: string; fallback: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span aria-hidden className={`inline-flex items-center justify-center leading-none ${className}`}>{fallback}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- plain img so a missing file can fall back to the emoji
    <img src={`/ui/${name}.png`} alt="" aria-hidden draggable={false} onError={() => setFailed(true)} className={`inline-block select-none object-contain ${className}`} />
  );
}

const TEAM_FILE: Record<Team, string> = { 1: "team-marigold", 2: "team-pumpkin" };

// Inline by default (sits on the text baseline at 1.25em); pass a size class to make it bigger.
export function TeamIcon({ team, className = "h-[1.25em] w-[1.25em] align-[-0.25em]" }: { team: Team; className?: string }) {
  return <UiIcon name={TEAM_FILE[team]} fallback={TEAM_META[team].icon} className={className} />;
}

const CANDY_FILE = { easy: "candy-chocolate", medium: "candy-sour-gummy", hard: "candy-chili-tamarind" } as const;
const CANDY_EMOJI = { easy: "🍫", medium: "🍬", hard: "🌶️" } as const;

export function CandyIcon({ level, className = "h-8 w-8" }: { level: keyof typeof CANDY_FILE; className?: string }) {
  return <UiIcon name={CANDY_FILE[level]} fallback={CANDY_EMOJI[level]} className={className} />;
}
