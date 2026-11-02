"use client";

// Always within reach once a game is on: either phone can send both phones back to the lobby. Sits next to the
// sound and effects buttons (AudioControls). A confirmation first, because it ends the game for the other team too.

import { useState } from "react";
import { newGame } from "@/app/actions/room";
import type { Identity } from "@/lib/identity";
import { Button, ErrorText } from "./ui";

export function NewGameButton({ identity, refresh }: { identity: Identity; refresh: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await newGame(identity);
      if (!res.ok) setError(res.message);
      await refresh();
    } catch {
      setError("Can't reach the game. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-0 right-[100px] z-50 flex h-11 w-11 items-center justify-center rounded-b-2xl bg-indigo-950/85 text-[11px] leading-none font-black text-amber-300"
      >
        New game
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-indigo-950/80 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="new-game-title" className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border-4 border-amber-400 bg-indigo-900 p-4 text-center">
            <h2 id="new-game-title" className="text-2xl font-black text-amber-400">
              Start a new game?
            </h2>
            <p className="text-base font-bold text-indigo-100">This ends the game on both phones and goes back to the lobby.</p>
            <ErrorText>{error}</ErrorText>
            <Button onClick={confirm} disabled={busy} className="w-full">
              {busy ? "One moment…" : "Yes, new game"}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy} className="w-full">
              Keep playing
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
