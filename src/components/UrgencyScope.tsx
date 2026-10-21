"use client";

// Spec section 8: as time runs out the screen gets tense. This provides the current effects to the timer
// (PlayHeader, Ring) and draws the soft red vignette on the screen edges. Never full-screen flashing:
// the vignette is red at the edges only, pulses at 2 Hz at most, and turns static with "Reduce effects".

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { urgencyFor, type Urgency } from "@/lib/game/urgency";
import { useUrgency } from "@/lib/useUrgency";

const UrgencyContext = createContext<Urgency>(urgencyFor(Number.POSITIVE_INFINITY, 1));

export function useCurrentUrgency(): Urgency {
  return useContext(UrgencyContext);
}

function Vignette({ urgency }: { urgency: Urgency }) {
  if (urgency.vignetteStrength <= 0) return null;
  const pulse = urgency.vignetteHz > 0;
  // One cycle (dim -> bright -> dim) lasts 1 / Hz seconds; the animation runs one direction per half cycle.
  const style = { "--vig": urgency.vignetteStrength, "--vig-half": `${0.5 / Math.max(urgency.vignetteHz, 1)}s` } as CSSProperties;
  return <div aria-hidden className={`fx-vignette ${pulse ? "fx-vignette-pulse" : ""}`} style={style} />;
}

export function UrgencyScope({ leftMs, totalMs, kind, children }: { leftMs: number; totalMs: number; kind: "play" | "culture"; children: ReactNode }) {
  const urgency = useUrgency(leftMs, totalMs, kind);
  return (
    <UrgencyContext.Provider value={urgency}>
      {children}
      <Vignette urgency={urgency} />
    </UrgencyContext.Provider>
  );
}
