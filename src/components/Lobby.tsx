"use client";

// Screen 2: the lobby. PIN, the two team cards (one phone each), host crown, Start (host), Settings tab.

import { useState } from "react";
import { leaveRoom, startGame } from "@/app/actions/room";
import { canStart } from "@/lib/game/room";
import type { Team } from "@/lib/game/types";
import type { Identity } from "@/lib/identity";
import type { SyncMode } from "@/lib/supabase/subscribeRoom";
import type { PlayerRow, RoomSnapshot } from "@/lib/supabase/types";
import { SettingsPanel } from "./SettingsPanel";
import { TEAM_META } from "./teams";
import { Button, ErrorText, Shell } from "./ui";
import { TeamIcon } from "./UiIcon";

interface Props {
  snapshot: RoomSnapshot;
  me: PlayerRow;
  identity: Identity;
  syncMode: SyncMode;
  refresh: () => Promise<void>;
  onLeft: () => void;
}

function TeamCard({ team, phone, hostId, myId }: { team: Team; phone: PlayerRow | undefined; hostId: string | null; myId: string }) {
  const meta = TEAM_META[team];
  const status = !phone ? "Waiting for the other phone…" : phone.id === myId ? "This phone" : "Phone ready";
  return (
    <section
      aria-label={meta.name}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center ${meta.panel} ${phone ? "" : "border-dashed opacity-80"}`}
    >
      <span aria-hidden className="text-3xl leading-none">
        <TeamIcon team={team} className="h-12 w-12" />
      </span>
      <h2 className={`text-base font-black ${meta.title}`}>{meta.name}</h2>
      <span className={`rounded-full px-2 py-0.5 text-sm font-extrabold ${phone ? meta.badge : "bg-indigo-950/70 text-indigo-200"}`}>
        {phone ? "✓ " : ""}
        {status}
      </span>
      {phone && phone.id === hostId && (
        <span className="text-sm font-bold text-amber-300">
          <span aria-hidden>👑</span> Host
        </span>
      )}
    </section>
  );
}

export function Lobby({ snapshot, me, identity, syncMode, refresh, onLeft }: Props) {
  const { room, players } = snapshot;
  const isHost = room.host_id === me.id;
  const [tab, setTab] = useState<"teams" | "settings">("teams");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [shared, setShared] = useState<string | null>(null);

  const ready = canStart(players);
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/room/${room.pin}`;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await startGame(identity);
      if (!res.ok) setError(res.message);
      await refresh();
    } catch {
      setError("Can't reach the game. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    try {
      await leaveRoom(identity);
    } catch {
      // leaving is best effort: the phone forgets the room either way
    }
    onLeft();
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ url: link, title: "Pumpskull" });
      else {
        await navigator.clipboard.writeText(link);
        setShared("Link copied!");
      }
    } catch {
      setShared("Copy the link below");
    }
    setTimeout(() => setShared(null), 2500);
  }

  return (
    <Shell>
      <section className="flex items-center justify-between gap-3 rounded-2xl border-2 border-indigo-400 bg-indigo-900/70 px-3 py-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-bold text-indigo-200">Room PIN{syncMode === "polling" ? " · backup sync" : ""}</span>
          <span className="text-4xl leading-none font-black tracking-[0.12em] text-amber-400" aria-label={`Room PIN ${room.pin.split("").join(" ")}`}>
            {room.pin}
          </span>
        </div>
        <Button variant="secondary" onClick={share} className="min-h-11 shrink-0 text-base">
          {shared ?? "Share"}
        </Button>
      </section>

      <div role="tablist" className="grid grid-cols-2 gap-2">
        {(["teams", "settings"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-11 rounded-xl border-b-4 text-base font-extrabold capitalize ${
              tab === t ? "border-amber-600 bg-amber-400 text-indigo-950" : "border-indigo-900 bg-indigo-700 text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {tab === "teams" ? (
          <>
            <div className="grid grid-cols-2 items-stretch gap-2">
              {([1, 2] as const).map((team) => (
                <TeamCard key={team} team={team} phone={players.find((p) => p.team === team)} hostId={room.host_id} myId={me.id} />
              ))}
            </div>
            <p className="rounded-2xl bg-indigo-900/70 p-2 text-center text-sm font-bold text-teal-300">
              One phone per team. Gather your team around your phone!
            </p>
          </>
        ) : (
          <SettingsPanel room={room} isHost={isHost} identity={identity} refresh={refresh} />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <ErrorText>{error}</ErrorText>
        {isHost ? (
          <>
            <Button onClick={start} disabled={!ready || busy} className="w-full text-xl">
              Start game
            </Button>
            {!ready && <p className="text-center text-xs text-indigo-200">The other team joins with PIN {room.pin} on their phone.</p>}
          </>
        ) : (
          <p className="rounded-2xl bg-indigo-900/70 p-3 text-center font-bold text-indigo-100">Waiting for the host to start…</p>
        )}

        {confirmLeave ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-bold">Leave this room?</span>
            <Button variant="secondary" onClick={leave} disabled={busy} className="min-h-10 py-1 text-base">
              Yes, leave
            </Button>
            <Button variant="ghost" onClick={() => setConfirmLeave(false)} className="min-h-10 py-1 text-base">
              Stay
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmLeave(true)} className="min-h-10 py-0 text-base">
            Leave room
          </Button>
        )}
      </div>
    </Shell>
  );
}
