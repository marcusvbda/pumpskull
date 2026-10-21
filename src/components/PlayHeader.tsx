import type { Team } from "@/lib/game/types";
import { TEAM_META } from "./teams";
import { useCurrentUrgency } from "./UrgencyScope";

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// Team, role and the play timer. The timer gets orange, then red, then shakes as time runs out (spec section 8).
export function PlayHeader({ team, role, leftMs, play, plays }: { team: Team; role: "describer" | "builder"; leftMs: number; play: number; plays: number }) {
  const meta = TEAM_META[team];
  const urgency = useCurrentUrgency();
  const seconds = Math.max(0, Math.ceil(leftMs / 1000));
  const colour = { normal: "border-indigo-950 bg-indigo-800", orange: "border-orange-700 bg-orange-500 text-indigo-950", red: "border-red-900 bg-red-600 text-white" }[urgency.timerColour];
  const shake = { none: "", light: "fx-shake-light", strong: "fx-shake-strong" }[urgency.shake];
  // Last 5 seconds: the number pops each second.
  const pop = urgency.phase === 4 && urgency.timerScale > 1 ? "fx-pop" : "";
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
      <span key={pop ? seconds : "timer"} className={`inline-block ${pop}`}>
        <span
          role="timer"
          aria-label={`${formatClock(leftMs)} left`}
          className={`block min-w-20 rounded-2xl border-b-4 px-3 py-1 text-center font-black tabular-nums transition-colors ${colour} ${shake} ${urgency.timerScale > 1 ? "text-3xl" : "text-2xl"}`}
        >
          {formatClock(leftMs)}
        </span>
      </span>
    </header>
  );
}
