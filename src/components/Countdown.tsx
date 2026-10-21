// Screen 5: 3-2-1, then a 2-second role banner.

import { GAME } from "@/lib/game/config";
import type { Team } from "@/lib/game/types";
import { TEAM_META } from "./teams";
import { Shell } from "./ui";

export function Countdown({ leftMs, myTeam, describing, play, plays }: { leftMs: number; myTeam: Team; describing: boolean; play: number; plays: number }) {
  const bannerMs = GAME.roleBannerSeconds * 1000;
  const counting = leftMs > bannerMs;
  const number = Math.min(GAME.countdownSeconds, Math.max(1, Math.ceil((leftMs - bannerMs) / 1000)));
  const meta = TEAM_META[myTeam];

  return (
    <Shell center>
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-lg font-bold text-indigo-200">
          Play {play + 1} of {plays}
        </p>
        {counting ? (
          <span key={number} aria-live="assertive" className="text-9xl font-black text-amber-400 motion-safe:animate-pulse">
            {number}
          </span>
        ) : (
          <div aria-live="assertive" className={`flex w-full flex-col items-center gap-2 rounded-3xl border-4 p-6 ${meta.panel}`}>
            <span aria-hidden className="text-6xl">
              {describing ? "🗣️" : "🧩"}
            </span>
            <span className="text-4xl font-black text-white">{describing ? "Your team describes" : "Your team builds"}</span>
            <span className={`text-lg font-bold ${meta.title}`}>
              <span aria-hidden>{meta.icon}</span> {meta.name}
            </span>
            <span className="text-base text-indigo-100">
              {describing ? "Only your team sees the picture. Describe it in English!" : "Listen to the other team and rebuild the scene."}
            </span>
          </div>
        )}
      </div>
    </Shell>
  );
}
