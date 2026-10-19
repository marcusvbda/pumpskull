"use client";

// Screen 2: the lobby. PIN, team columns, host crown, Start (host), Settings tab.

import { useState } from "react";
import { leaveRoom, startGame } from "@/app/actions/room";
import { GAME } from "@/lib/game/config";
import { canStart, teamCounts } from "@/lib/game/teams";
import type { Team } from "@/lib/game/types";
import type { Identity } from "@/lib/identity";
import type { SyncMode } from "@/lib/supabase/subscribeRoom";
import type { PlayerRow, RoomSnapshot } from "@/lib/supabase/types";
import { Avatar } from "./Avatar";
import { SettingsPanel } from "./SettingsPanel";
import { TEAM_META } from "./teams";
import { Button, ErrorText, Logo, Shell } from "./ui";

interface Props {
  snapshot: RoomSnapshot;
  me: PlayerRow;
  identity: Identity;
  syncMode: SyncMode;
  refresh: () => Promise<void>;
  onLeft: () => void;
}

function TeamColumn({ team, players, hostId, myId }: { team: Team; players: PlayerRow[]; hostId: string | null; myId: string }) {
  const meta = TEAM_META[team];
  return (
    <section aria-label={meta.name} className={`flex min-w-0 flex-col gap-2 rounded-2xl border-2 p-2 ${meta.panel}`}>
      <header className="flex flex-col items-center gap-1 text-center">
        <h2 className={`text-base font-black ${meta.title}`}>
          <span aria-hidden>{meta.icon}</span> {meta.name}
        </h2>
        <span className={`rounded-full px-2 py-0.5 text-sm font-extrabold ${meta.badge}`}>
          {players.length}/{GAME.maxPerTeam}
        </span>
      </header>
      <ul className="flex flex-col gap-1.5">
        {players.map((p) => (
          <li key={p.id} className="flex min-h-11 items-center gap-2 rounded-xl bg-indigo-950/70 px-1.5 py-1">
            <Avatar n={p.avatar} size={36} />
            <span className="min-w-0 flex-1 truncate text-sm font-bold">
              {p.nickname}
              {p.id === myId && <span className="ml-1 text-xs font-semibold text-teal-300">(you)</span>}
            </span>
            {p.id === hostId && (
              <span role="img" aria-label="Host" title="Host">
                👑
              </span>
            )}
          </li>
        ))}
        {players.length === 0 && <li className="px-2 py-3 text-center text-sm text-indigo-300">Waiting for players…</li>}
      </ul>
    </section>
  );
}

export function Lobby({ snapshot, me, identity, syncMode, refresh, onLeft }: Props) {
  const { room, players } = snapshot;
  const isHost = room.host_id === me.id;
  const [tab, setTab] = useState<"players" | "settings">("players");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [shared, setShared] = useState<string | null>(null);

  const members = players.map((p) => ({ id: p.id, team: p.team, joinedAt: p.joined_at }));
  const counts = teamCounts(members);
  const ready = canStart(members);
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
      <div className="flex items-center justify-between">
        <Logo size="sm" />
        {syncMode === "polling" && <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs font-bold text-amber-300">Backup sync</span>}
      </div>

      <section className="flex flex-col items-center gap-1 rounded-2xl border-2 border-indigo-400 bg-indigo-900/70 p-3 text-center">
        <span className="text-sm font-bold text-indigo-200">Room PIN</span>
        <span className="text-6xl font-black tracking-[0.2em] text-amber-400" aria-label={`Room PIN ${room.pin.split("").join(" ")}`}>
          {room.pin}
        </span>
        <Button variant="secondary" onClick={share} className="mt-1 min-h-11 text-base">
          {shared ?? "Share link"}
        </Button>
        <span className="max-w-full select-all truncate text-xs text-indigo-300">{link}</span>
      </section>

      <div role="tablist" className="grid grid-cols-2 gap-2">
        {(["players", "settings"] as const).map((t) => (
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

      {tab === "players" ? (
        <>
          <p className="text-center text-sm font-bold text-indigo-200">
            {players.length}/{GAME.maxPlayers} players
          </p>
          <div className="grid grid-cols-2 items-start gap-2">
            {([1, 2] as const).map((team) => (
              <TeamColumn key={team} team={team} players={players.filter((p) => p.team === team)} hostId={room.host_id} myId={me.id} />
            ))}
          </div>
        </>
      ) : (
        <SettingsPanel room={room} isHost={isHost} identity={identity} refresh={refresh} />
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <ErrorText>{error}</ErrorText>
        {isHost ? (
          <>
            <Button onClick={start} disabled={!ready || busy} className="w-full text-xl">
              Start game
            </Button>
            {!ready && (
              <p className="text-center text-sm text-indigo-200">
                Each team needs at least 1 player ({TEAM_META[1].name} {counts[1]}, {TEAM_META[2].name} {counts[2]}).
              </p>
            )}
          </>
        ) : (
          <p className="rounded-2xl bg-indigo-900/70 p-3 text-center font-bold text-indigo-100">Waiting for the host to start…</p>
        )}

        {confirmLeave ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-bold">Leave this room?</span>
            <Button variant="secondary" onClick={leave} disabled={busy} className="min-h-11 text-base">
              Yes, leave
            </Button>
            <Button variant="ghost" onClick={() => setConfirmLeave(false)} className="min-h-11 text-base">
              Stay
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmLeave(true)} className="min-h-11 text-base">
            Leave room
          </Button>
        )}
      </div>
    </Shell>
  );
}
