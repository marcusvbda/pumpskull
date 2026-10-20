import type { Team } from "@/lib/game/types";
import { TEAM_META } from "./teams";

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// Team, role and the play timer. Urgency effects come in build step 7.
export function PlayHeader({ team, role, leftMs, play, plays }: { team: Team; role: "describer" | "builder"; leftMs: number; play: number; plays: number }) {
  const meta = TEAM_META[team];
  return (
    <header className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 flex-col">
        <span className={`truncate text-sm font-black ${meta.title}`}>
          <span aria-hidden>{meta.icon}</span> {meta.name}
        </span>
        <span className="text-xs font-bold text-indigo-200">
          Play {play + 1} of {plays} · {role === "describer" ? "You describe" : "You build"}
        </span>
      </div>
      <span
        role="timer"
        aria-label={`${formatClock(leftMs)} left`}
        className="min-w-20 rounded-2xl border-b-4 border-indigo-950 bg-indigo-800 px-3 py-1 text-center text-2xl font-black tabular-nums"
      >
        {formatClock(leftMs)}
      </span>
    </header>
  );
}
