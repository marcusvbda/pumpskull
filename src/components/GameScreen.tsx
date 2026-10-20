"use client";

// Everything after the lobby: picks the screen for the room's phase, loads this phone's view of the play
// (target or tray) and asks the server to move on when a timer runs out. Both phones ask; the server checks
// its own clock and moves the room only once.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { advanceTimer, getPlayView, type PlayView } from "@/app/actions/play";
import { DIFFICULTY, PLAY } from "@/lib/game/config";
import { countdownEndsAt, playClosesAt, playEndsAt, totalPlays } from "@/lib/game/flow";
import { rolesForPlay } from "@/lib/game/roles";
import type { Identity } from "@/lib/identity";
import type { PlayerRow, RoomSnapshot } from "@/lib/supabase/types";
import { useServerNow } from "@/lib/useServerNow";
import { Builder } from "./Builder";
import { Countdown } from "./Countdown";
import { Describer } from "./Describer";
import { Reveal, SpiritMeter } from "./Reveal";
import { Shell } from "./ui";

interface Props {
  snapshot: RoomSnapshot;
  me: PlayerRow;
  identity: Identity;
  offsetMs: number;
  refresh: () => Promise<void>;
}

function Loading({ text }: { text: string }) {
  return (
    <Shell>
      <p className="pt-16 text-center text-xl font-bold text-indigo-200">{text}</p>
    </Shell>
  );
}

// This phone's view of the current play, fetched once per play (and again after a reload).
function usePlayView(identity: Identity, play: number, active: boolean): PlayView | null {
  const [view, setView] = useState<PlayView | null>(null);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const res = await getPlayView(identity);
        if (cancelled) return;
        if (res.ok && res.view.play === play) {
          setView(res.view);
          return;
        }
        if (!res.ok && res.error === "play_over") return;
      } catch {
        // offline: try again below
      }
      if (!cancelled) timer = setTimeout(load, 1000);
    };
    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [identity, play, active]);
  return view && view.play === play ? view : null;
}

export function GameScreen({ snapshot, me, identity, offsetMs, refresh }: Props) {
  const { room } = snapshot;
  const now = useServerNow(offsetMs);
  const play = room.current_play;
  const plays = totalPlays(room.settings);
  const roles = rolesForPlay(play);
  const playRow = snapshot.plays.find((p) => p.idx === play);
  const result = snapshot.playResults.find((r) => r.play_idx === play);
  const inPlay = room.phase === "countdown" || room.phase === "playing";
  const view = usePlayView(identity, play, inPlay);

  // When does the current phase's timer run out? null: no timer (the host moves on).
  let dueAt: number | null = null;
  if (room.phase === "countdown") dueAt = countdownEndsAt(room.phase_started_at);
  else if (room.phase === "playing" && room.play_started_at) dueAt = playClosesAt(room.play_started_at, room.settings);
  else if (room.phase === "reveal" && !result) dueAt = Date.parse(room.phase_started_at) + PLAY.resultsRetrySeconds * 1000;

  const due = dueAt !== null && now >= dueAt;
  const lastAsk = useRef<{ key: string; at: number } | null>(null);
  useEffect(() => {
    if (!due) return;
    const key = `${room.phase}:${play}`;
    const recent = lastAsk.current?.key === key && Date.now() - lastAsk.current.at < PLAY.timerRetrySeconds * 1000;
    if (recent) return;
    lastAsk.current = { key, at: Date.now() };
    void advanceTimer({ ...identity, phase: room.phase, play })
      .then(() => refresh())
      .catch(() => {});
  }, [due, now, room.phase, play, identity, refresh]);

  const spiritMax = plays * DIFFICULTY[room.settings.difficulty].items;

  if (room.phase === "countdown") {
    return <Countdown leftMs={countdownEndsAt(room.phase_started_at) - now} myTeam={me.team} describing={me.team === roles.describerTeam} play={play} plays={plays} />;
  }

  if (room.phase === "playing") {
    if (!view || !playRow || !room.play_started_at) return <Loading text="Getting the scene ready…" />;
    const leftMs = playEndsAt(room.play_started_at, room.settings) - now;
    const common = { scene: playRow.scene, backgroundId: playRow.background_id, difficulty: room.settings.difficulty, team: me.team, leftMs, play, plays };
    return view.role === "describer" ? (
      <Describer {...common} targets={view.targets} />
    ) : (
      <Builder {...common} key={play} identity={identity} tray={view.tray} initialPlaced={view.placed} />
    );
  }

  if (room.phase === "reveal") {
    if (!playRow) return <Loading text="Counting the points…" />;
    return (
      <Reveal
        identity={identity}
        isHost={room.host_id === me.id}
        play={play}
        plays={plays}
        scene={playRow.scene}
        backgroundId={playRow.background_id}
        describerTeam={playRow.describer_team}
        result={result}
        spiritMeter={Number(room.spirit_meter)}
        spiritMax={spiritMax}
        refresh={refresh}
      />
    );
  }

  if (room.phase === "finished") {
    // Culture Check, scoreboard and the final screen come in build step 5.
    return (
      <Shell>
        <div className="flex flex-1 flex-col justify-center gap-6 text-center">
          <h1 className="text-4xl font-black text-amber-400">Game over!</h1>
          <p className="text-indigo-100">Great teamwork. The winner is decided by the Culture Check, coming in the next build step.</p>
          <SpiritMeter value={Number(room.spirit_meter)} max={spiritMax} />
          <Link href="/" className="flex min-h-12 items-center justify-center rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-6 text-lg font-extrabold text-indigo-950">
            Home
          </Link>
        </div>
      </Shell>
    );
  }

  return <Loading text="One moment…" />;
}
