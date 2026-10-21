// Urgency phases (spec section 8): driven by the fraction of time left, never by a local countdown.
// Pure: the play screens and the Culture Check both use it, and both phones get the same answer
// because they feed it the same server-derived time.

import { MUSIC_MAX_RATE, URGENCY, URGENCY_HURRY_MIN_SECONDS, URGENCY_LAST_SECONDS } from "./config";

export type UrgencyPhase = 0 | 1 | 2 | 3 | 4; // 4 = the last 5 seconds

export interface Urgency {
  phase: UrgencyPhase;
  musicRate: number; // for a single track; capped by MUSIC_MAX_RATE
  vignetteHz: 0 | 1 | 2; // pulses per second of the red screen edges (never above MAX_EFFECT_HZ)
  vignetteStrength: number; // 0..1
  shake: "none" | "light" | "strong";
  tick: "none" | "tick" | "fast" | "beep"; // one sound per second
  timerColour: "normal" | "orange" | "red";
  timerScale: number;
}

const PHASES: Record<UrgencyPhase, Omit<Urgency, "phase" | "musicRate">> = {
  0: { vignetteHz: 0, vignetteStrength: 0, shake: "none", tick: "none", timerColour: "normal", timerScale: 1 },
  1: { vignetteHz: 0, vignetteStrength: 0, shake: "none", tick: "none", timerColour: "orange", timerScale: 1 },
  2: { vignetteHz: 1, vignetteStrength: 0.5, shake: "light", tick: "tick", timerColour: "red", timerScale: 1 },
  3: { vignetteHz: 2, vignetteStrength: 0.75, shake: "strong", tick: "fast", timerColour: "red", timerScale: 1.15 },
  4: { vignetteHz: 2, vignetteStrength: 1, shake: "strong", tick: "beep", timerColour: "red", timerScale: 1.15 },
};

// leftMs <= 0 (or a bad number) is the last phase; more than the whole time left is the calm phase.
export function urgencyFor(leftMs: number, totalMs: number): Urgency {
  const left = Number.isFinite(leftMs) ? leftMs : 0;
  const fraction = totalMs > 0 ? left / totalMs : 0;
  const hurryMs = Math.max(URGENCY[2].minLeft * totalMs, URGENCY_HURRY_MIN_SECONDS * 1000);

  let phase: UrgencyPhase;
  if (left <= URGENCY_LAST_SECONDS.seconds * 1000) phase = 4;
  else if (left <= hurryMs && fraction < URGENCY[1].minLeft) phase = 3;
  else if (fraction <= URGENCY[1].minLeft) phase = 2;
  else if (fraction <= URGENCY[0].minLeft) phase = 1;
  else phase = 0;

  const rate = phase === 4 ? URGENCY_LAST_SECONDS.musicRate : URGENCY[Math.min(phase, 3)].musicRate;
  return { phase, musicRate: Math.min(rate, MUSIC_MAX_RATE), ...PHASES[phase] };
}

// The Culture Check only gets a lighter version in its last 5 seconds: soft pulse and a tick, no shake.
export function cultureUrgencyFor(leftMs: number): Urgency {
  const calm = PHASES[0];
  if (leftMs > URGENCY_LAST_SECONDS.seconds * 1000) return { phase: 0, musicRate: 1, ...calm };
  return { phase: 4, musicRate: 1, ...calm, vignetteHz: 1, vignetteStrength: 0.4, tick: "tick", timerColour: "red" };
}

// Reduce effects keeps the sound and the timer colour, and drops everything that moves or pulses.
export function withReducedEffects(u: Urgency): Urgency {
  return { ...u, shake: "none", vignetteHz: 0, vignetteStrength: u.vignetteStrength > 0 ? Math.min(0.35, u.vignetteStrength) : 0, timerScale: 1 };
}
