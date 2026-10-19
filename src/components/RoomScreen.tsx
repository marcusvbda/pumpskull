"use client";

// /room/[pin]: decides what this phone sees. Not in the room yet -> nickname + avatar (join).
// In the room -> the screen for the room's phase (only the lobby exists so far).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { heartbeat } from "@/app/actions/room";
import { GAME } from "@/lib/game/config";
import { parsePin } from "@/lib/game/room";
import { clearIdentity, useStoredIdentity, type Identity } from "@/lib/identity";
import { fetchRoomSnapshot } from "@/lib/supabase/subscribeRoom";
import { useRoom } from "@/lib/useRoom";
import { Lobby } from "./Lobby";
import { ProfileForm } from "./ProfileForm";
import { TEAM_META } from "./teams";
import { Button, Shell } from "./ui";

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Shell>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-3xl font-black text-amber-400">{title}</h1>
        {children}
        <Link href="/" className="flex min-h-12 items-center rounded-2xl border-b-4 border-indigo-900 bg-indigo-600 px-6 text-lg font-extrabold">
          Home
        </Link>
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
  const { snapshot, mode, failed, refresh } = useRoom(pin);

  const identity: Identity | null = stored && stored.pin === pin ? stored : null;
  const me = identity && snapshot ? snapshot.players.find((p) => p.id === identity.playerId) : undefined;
  const removed = Boolean(identity && snapshot && !me);

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
      <Shell>
        <p className="pt-16 text-center text-lg font-bold text-indigo-200">Loading room {pin}…</p>
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
      <Shell>
        <p className="pt-16 text-center text-lg font-bold text-indigo-200">Checking your seat…</p>
      </Shell>
    );
  }

  if (!me || !identity) {
    const { room, players } = snapshot;
    if (room.status !== "lobby") return <Notice title="Game already started">Ask your teacher to start a new room.</Notice>;
    if (players.length >= GAME.maxPlayers) return <Notice title="Room full">This room already has {GAME.maxPlayers} players.</Notice>;
    return (
      <Shell>
        <ProfileForm mode="join" pin={pin} onBack={() => router.push("/")} onDone={() => {}} />
      </Shell>
    );
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

  // Build step 4 (countdown, describer, builder) is not built yet.
  const team = TEAM_META[me.team];
  return (
    <Shell>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-3xl font-black text-amber-400">The game has started!</h1>
        <p className={`text-xl font-bold ${team.title}`}>
          {team.icon} You are in {team.name}
        </p>
        <p className="text-indigo-200">The play screens come in the next build step.</p>
        <Button variant="secondary" onClick={() => router.push("/")}>
          Home
        </Button>
      </div>
    </Shell>
  );
}
