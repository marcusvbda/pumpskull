"use client";

// Ticks, alarm and music speed for a timer, from the server-derived time left. Returns the effects to show.

import { useEffect, useRef } from "react";
import { cultureUrgencyFor, urgencyFor, withReducedEffects, type Urgency } from "@/lib/game/urgency";
import { playSfx, setMusicUrgency } from "./audio";
import { usePrefs } from "./prefs";

const TICK_SFX = { tick: "tick", fast: "tickFast", beep: "beep" } as const;

export function useUrgency(leftMs: number, totalMs: number, kind: "play" | "culture"): Urgency {
  const { reduced } = usePrefs();
  const raw = kind === "play" ? urgencyFor(leftMs, totalMs) : cultureUrgencyFor(leftMs);
  const running = leftMs > 0;
  const seconds = Math.ceil(leftMs / 1000);
  const tick = raw.tick;
  const phase = raw.phase;
  const rate = raw.musicRate;

  // One sound per second while the timer runs.
  useEffect(() => {
    if (running && tick !== "none") playSfx(TICK_SFX[tick]);
  }, [seconds, tick, running]);

  // The alarm when the timer runs out on this screen (not when a phone arrives after it ended).
  const wasRunning = useRef(running);
  useEffect(() => {
    if (kind === "play" && wasRunning.current && !running) playSfx("alarm");
    wasRunning.current = running;
  }, [running, kind]);

  // The music follows the phase during a play.
  useEffect(() => {
    if (kind !== "play") return;
    setMusicUrgency(rate, phase >= 2);
    return () => setMusicUrgency(1, false);
  }, [kind, rate, phase]);

  return reduced ? withReducedEffects(raw) : raw;
}
