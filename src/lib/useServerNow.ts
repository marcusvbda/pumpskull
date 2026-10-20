"use client";

// Server time on this phone, re-rendered a few times per second. Timers are always derived from the times
// stored on the server (phase_started_at, play_started_at), never from a local countdown.

import { useEffect, useState } from "react";

export function useServerNow(offsetMs: number, intervalMs = 250): number {
  const [local, setLocal] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setLocal(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return local + offsetMs;
}
