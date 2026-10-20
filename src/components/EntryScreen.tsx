"use client";

// Screen 1: create a room (this phone becomes Team Marigold) or enter a PIN (the other team's phone).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { enterRoom } from "@/lib/enterRoom";
import { clearIdentity, useStoredIdentity } from "@/lib/identity";
import { Button, ErrorText, Logo, Mascot, Shell } from "./ui";

export function EntryScreen() {
  const router = useRouter();
  const stored = useStoredIdentity();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function go(kind: "create" | "join") {
    if (busy) return;
    setBusy(kind);
    setCreateError(null);
    setJoinError(null);
    const res = await enterRoom(kind === "join" ? pin : undefined);
    if (res.ok) {
      router.push(`/room/${res.identity.pin}`);
      return; // keep the buttons locked while the room page loads
    }
    (kind === "join" ? setJoinError : setCreateError)(res.message);
    setBusy(null);
  }

  function enterPin(event: React.FormEvent) {
    event.preventDefault();
    if (pin.length === 4) void go("join");
  }

  return (
    <Shell>
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <Logo />
        <Mascot difficulty="easy" size={96} />
        <p className="text-indigo-100">Day of the Dead vs Halloween. Describe, build, and learn English together.</p>
        <p className="text-sm font-bold text-teal-300">One phone per team. Gather your team around it!</p>
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

      <div className="flex flex-col gap-2">
        <Button onClick={() => go("create")} disabled={busy !== null} className="w-full text-xl">
          {busy === "create" ? "One moment…" : "Create room"}
        </Button>
        <ErrorText>{createError}</ErrorText>
      </div>

      <div className="flex items-center gap-3 text-indigo-300" aria-hidden>
        <span className="h-px flex-1 bg-indigo-700" />
        or join the other team
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
              setJoinError(null);
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder="0000"
            enterKeyHint="go"
            className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-indigo-400 bg-indigo-950 px-4 text-center text-2xl font-black tracking-[0.4em] text-white outline-none placeholder:text-indigo-700 focus:border-amber-400"
          />
          <Button type="submit" variant="secondary" disabled={pin.length !== 4 || busy !== null} className="px-6">
            {busy === "join" ? "…" : "Join"}
          </Button>
        </div>
        <ErrorText>{joinError}</ErrorText>
      </form>
    </Shell>
  );
}
