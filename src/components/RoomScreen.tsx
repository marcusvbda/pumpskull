"use client";

// /room/[pin]: decides what this phone sees. Not in the room yet -> join card for the free team.
// In the room -> the lobby, then the game screens.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { setMusicMode, type MusicMode } from "@/lib/audio";
import { heartbeat } from "@/app/actions/room";
import { GAME } from "@/lib/game/config";
import { freeTeam, parsePin } from "@/lib/game/room";
import type { Team } from "@/lib/game/types";
import { enterRoom } from "@/lib/enterRoom";
import { clearIdentity, useStoredIdentity, type Identity } from "@/lib/identity";
import { fetchRoomSnapshot } from "@/lib/supabase/subscribeRoom";
import { useRoom } from "@/lib/useRoom";
import { GameScreen } from "./GameScreen";
import { Lobby } from "./Lobby";
import { TEAM_META } from "./teams";
import { Button, ErrorText, Shell } from "./ui";
import { TeamIcon } from "./UiIcon";

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Shell center>
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-black text-amber-400">{title}</h1>
        {children}
        <Link href="/" className="flex min-h-12 items-center rounded-2xl border-b-4 border-indigo-900 bg-indigo-600 px-6 text-lg font-extrabold">
          Home
        </Link>
      </div>
    </Shell>
  );
}

// Opened from a shared link or QR: one tap takes the free team seat.
function JoinCard({ pin, team, onBack }: { pin: string; team: Team; onBack: () => void }) {
  const meta = TEAM_META[team];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    const res = await enterRoom(pin);
    // On success the stored identity changes and the room screen re-renders into the lobby.
    if (!res.ok) setError(res.message);
    setBusy(false);
  }

  return (
    <Shell center>
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="text-sm font-bold text-indigo-200">Room {pin}</span>
        <h1 className="text-3xl font-black text-amber-400">Join the game</h1>
        <div className={`flex w-full flex-col items-center gap-1 rounded-2xl border-2 p-4 ${meta.panel}`}>
          <TeamIcon team={team} className="h-16 w-16" />
          <span className={`text-2xl font-black ${meta.title}`}>{meta.name}</span>
          <span className="text-sm text-indigo-100">This phone will play for {meta.name}.</span>
        </div>
        <p className="text-sm font-bold text-teal-300">One phone per team. Gather your team around it!</p>
        <ErrorText>{error}</ErrorText>
        <Button onClick={join} disabled={busy} className="w-full text-xl">
          {busy ? "One moment…" : `Join as ${meta.name}`}
        </Button>
        <Button variant="ghost" onClick={onBack} className="min-h-11 text-base">
          ← Back
        </Button>
      </div>
    </Shell>
  );
}

export function RoomScreen({ pin }: { pin: string }) {
  if (!parsePin(pin)) return <Notice title="Wrong PIN">The PIN has 4 digits.</Notice>;
  return <Room pin={pin} />;
}

function Room({ pin }: { pin: string }) {
  const router = useRouter();
  const stored = useStoredIdentity();
  const { snapshot, mode, failed, refresh, offsetMs } = useRoom(pin);

  const identity: Identity | null = stored && stored.pin === pin ? stored : null;
  const me = identity && snapshot ? snapshot.players.find((p) => p.id === identity.playerId) : undefined;
  const removed = Boolean(identity && snapshot && !me);

  // Music: calm in the lobby and at the end, the game track during the game. Silent until the first tap.
  const phase = snapshot?.room.phase;
  const music: MusicMode = !me ? "off" : phase === "lobby" || phase === "finished" ? "lobby" : "game";
  useEffect(() => {
    setMusicMode(music);
    return () => setMusicMode("off");
  }, [music]);

  // Heartbeat while in the room: every 30 s, and right when the phone wakes up.
  const playerId = me?.id;
  const token = identity?.token;
  useEffect(() => {
    if (!playerId || !token) return;
    const beat = () => {
      if (document.visibilityState === "visible") void heartbeat({ pin, playerId, token }).catch(() => {});
    };
    const timer = setInterval(beat, GAME.heartbeatSeconds * 1000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [pin, playerId, token]);

  // Missing from the snapshot: confirm with a fresh read (a snapshot can be a moment old right after joining),
  // then forget the identity so the phone is not stuck on a room it is no longer in.
  useEffect(() => {
    if (!removed || !identity) return;
    const timer = setTimeout(async () => {
      try {
        const fresh = await fetchRoomSnapshot(pin);
        if (!fresh || !fresh.players.some((p) => p.id === identity.playerId)) clearIdentity();
      } catch {
        // offline: keep the identity, try again on the next snapshot
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [removed, identity, pin]);

  if (snapshot === undefined || stored === undefined) {
    if (failed) return <Notice title="No connection">We can&apos;t reach the game right now. Check your internet and reload.</Notice>;
    return (
      <Shell center>
        <p className="text-center text-lg font-bold text-indigo-200">Loading room {pin}…</p>
      </Shell>
    );
  }

  if (snapshot === null) {
    // The room is gone (24 h limit, or the last player left).
    if (identity) clearIdentity();
    return <Notice title="Room closed">Room {pin} doesn&apos;t exist (any more).</Notice>;
  }

  if (removed) {
    return (
      <Shell center>
        <p className="text-center text-lg font-bold text-indigo-200">Checking your seat…</p>
      </Shell>
    );
  }

  if (!me || !identity) {
    const { room, players } = snapshot;
    if (room.status !== "lobby") return <Notice title="Game already started">Ask your teacher to start a new room.</Notice>;
    const team = freeTeam(players);
    if (team === null) return <Notice title="Room full">Both team phones are already in room {pin}.</Notice>;
    return <JoinCard pin={pin} team={team} onBack={() => router.push("/")} />;
  }

  if (snapshot.room.phase === "lobby") {
    return (
      <Lobby
        snapshot={snapshot}
        me={me}
        identity={identity}
        syncMode={mode}
        refresh={refresh}
        onLeft={() => {
          clearIdentity();
          router.push("/");
        }}
      />
    );
  }

  return <GameScreen snapshot={snapshot} me={me} identity={identity} offsetMs={offsetMs} refresh={refresh} />;
}
