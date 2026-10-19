"use client";

// Dev tool: watch subscribeRoom live. Edit the room in the Supabase table editor and see it arrive here.

import { useEffect, useState } from "react";
import { subscribeRoom, type SyncMode } from "@/lib/supabase/subscribeRoom";
import type { RoomSnapshot } from "@/lib/supabase/types";

export default function SyncDebug() {
  const [pin, setPin] = useState("");
  const [active, setActive] = useState<{ pin: string; forcePolling: boolean } | null>(null);
  const [forcePolling, setForcePolling] = useState(false);
  const [mode, setMode] = useState<SyncMode | "off">("off");
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null | undefined>(undefined);
  const [updates, setUpdates] = useState(0);
  const [lastAt, setLastAt] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active) return;
    const unsubscribe = subscribeRoom(
      active.pin,
      (s) => {
        setSnapshot(s);
        setUpdates((n) => n + 1);
        setLastAt(new Date().toLocaleTimeString());
        setError("");
      },
      { onMode: setMode, onError: (e) => setError(e instanceof Error ? e.message : JSON.stringify(e)), forcePolling: active.forcePolling },
    );
    return () => {
      unsubscribe();
      setMode("off");
    };
  }, [active]);

  const modeColour = mode === "realtime" ? "bg-green-500" : mode === "polling" ? "bg-amber-500" : "bg-zinc-500";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-3 p-4 text-sm text-white">
      <h1 className="text-lg font-bold">subscribeRoom debug</h1>
      <div className="flex gap-2">
        <input
          className="w-24 rounded bg-indigo-900 p-2 tracking-widest"
          inputMode="numeric"
          maxLength={4}
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        />
        <button className="rounded bg-amber-500 px-3 font-bold text-indigo-950" onClick={() => setActive(pin.length === 4 ? { pin, forcePolling } : null)}>
          Watch
        </button>
        <button className="rounded bg-indigo-800 px-3" onClick={() => setActive(null)}>
          Stop
        </button>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={forcePolling} onChange={(e) => setForcePolling(e.target.checked)} /> Force polling (simulate blocked WebSockets, press Watch again)
      </label>
      <p className="flex items-center gap-2">
        <span className={`inline-block h-3 w-3 rounded-full ${modeColour}`} /> Mode: <b>{mode}</b> · updates: {updates} {lastAt && `· last at ${lastAt}`}
      </p>
      {error && <p className="text-red-400">Error: {error}</p>}
      {snapshot === null && <p className="text-amber-300">Room not found.</p>}
      {snapshot && (
        <pre className="overflow-x-auto rounded bg-black/40 p-2 text-xs">{JSON.stringify(snapshot, null, 2)}</pre>
      )}
    </main>
  );
}
