"use client";

// Screen 1: create a room or enter a PIN.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GAME } from "@/lib/game/config";
import { clearIdentity, useStoredIdentity } from "@/lib/identity";
import { fetchRoomSnapshot } from "@/lib/supabase/subscribeRoom";
import { ProfileForm } from "./ProfileForm";
import { Button, ErrorText, Logo, Mascot, Shell } from "./ui";

type Step = { name: "home" } | { name: "create" } | { name: "join"; pin: string };

export function EntryScreen() {
  const router = useRouter();
  const stored = useStoredIdentity();
  const [step, setStep] = useState<Step>({ name: "home" });
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const goToRoom = (roomPin: string) => router.push(`/room/${roomPin}`);

  async function enterPin(event: React.FormEvent) {
    event.preventDefault();
    if (pin.length !== 4 || checking) return;
    setChecking(true);
    setError(null);
    try {
      const snapshot = await fetchRoomSnapshot(pin);
      if (!snapshot) setError("We can't find that room. Check the PIN.");
      else if (snapshot.room.status !== "lobby") setError("This game has already started.");
      else if (snapshot.players.length >= GAME.maxPlayers) setError(`This room is full (${GAME.maxPlayers} players).`);
      else setStep({ name: "join", pin });
    } catch {
      setError("Can't reach the game. Check your connection and try again.");
    } finally {
      setChecking(false);
    }
  }

  if (step.name !== "home") {
    return (
      <Shell>
        <ProfileForm
          mode={step.name}
          pin={step.name === "join" ? step.pin : undefined}
          onBack={() => setStep({ name: "home" })}
          onDone={(identity) => goToRoom(identity.pin)}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <Logo />
        <Mascot difficulty="easy" size={96} />
        <p className="text-indigo-100">Day of the Dead vs Halloween. Describe, build, and learn English together.</p>
      </div>

      {stored && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-teal-400/70 bg-teal-400/10 p-3">
          <span className="font-bold">You are in room {stored.pin}</span>
          <div className="flex gap-2">
            <Link href={`/room/${stored.pin}`} className="flex min-h-11 items-center rounded-xl bg-teal-400 px-4 font-extrabold text-indigo-950">
              Back
            </Link>
            <Button variant="ghost" onClick={clearIdentity} className="min-h-11 px-2 text-sm">
              Forget
            </Button>
          </div>
        </div>
      )}

      <Button onClick={() => setStep({ name: "create" })} className="w-full text-xl">
        Create room
      </Button>

      <div className="flex items-center gap-3 text-indigo-300" aria-hidden>
        <span className="h-px flex-1 bg-indigo-700" />
        or join a friend
        <span className="h-px flex-1 bg-indigo-700" />
      </div>

      <form onSubmit={enterPin} className="flex flex-col gap-2">
        <label className="font-bold" htmlFor="pin">
          Room PIN
        </label>
        <div className="flex gap-2">
          <input
            id="pin"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
              setError(null);
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder="0000"
            enterKeyHint="go"
            className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-indigo-400 bg-indigo-950 px-4 text-center text-2xl font-black tracking-[0.4em] text-white outline-none placeholder:text-indigo-700 focus:border-amber-400"
          />
          <Button type="submit" variant="secondary" disabled={pin.length !== 4 || checking} className="px-6">
            {checking ? "…" : "Join"}
          </Button>
        </div>
        <ErrorText>{error}</ErrorText>
      </form>
    </Shell>
  );
}
