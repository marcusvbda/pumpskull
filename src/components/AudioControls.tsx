"use client";

// Sound toggle and "Reduce effects" toggle, on every screen (spec section 8). Also unlocks the audio on the
// first tap, because browsers only allow sound after a user gesture.

import { useEffect } from "react";
import { refreshMuted, unlockAudio } from "@/lib/audio";
import { setMuted, setReduced, usePrefs } from "@/lib/prefs";

export function AudioControls() {
  const { muted, reduced } = usePrefs();

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    refreshMuted();
  }, [muted]);

  const button = "flex h-11 w-11 items-center justify-center rounded-b-2xl bg-indigo-950/85 text-xl";
  return (
    <div className="fixed top-0 right-1 z-50 flex gap-1">
      <button type="button" aria-pressed={reduced} aria-label="Reduce effects" title={reduced ? "Effects reduced" : "Reduce effects"} className={button} onClick={() => setReduced(!reduced)}>
        <span aria-hidden className={reduced ? "opacity-40" : ""}>
          ✨
        </span>
        {reduced ? <span aria-hidden className="absolute text-2xl font-black text-red-400">/</span> : null}
      </button>
      <button type="button" aria-pressed={muted} aria-label="Sound" title={muted ? "Sound off" : "Sound on"} className={button} onClick={() => setMuted(!muted)}>
        <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
      </button>
    </div>
  );
}
