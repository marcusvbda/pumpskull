"use client";

// Sound and "Reduce effects" settings (spec section 8). Kept in localStorage for this browser only, nothing
// is sent anywhere. Reduce effects starts on when the phone asks for reduced motion. Every storage access is
// wrapped: private mode must not crash the game.

import { useSyncExternalStore } from "react";

const MUTED = "pumpskull:muted";
const REDUCED = "pumpskull:reduce-effects";
const CHANGED = "pumpskull:prefs";

const memory: Record<string, string> = {};

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory[key] ?? null;
  }
}

function write(key: string, value: string) {
  memory[key] = value;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // memory fallback above
  }
  window.dispatchEvent(new Event(CHANGED));
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  return typeof window !== "undefined" && read(MUTED) === "1";
}

export function isReduced(): boolean {
  if (typeof window === "undefined") return false;
  const stored = read(REDUCED);
  return stored === null ? prefersReducedMotion() : stored === "1";
}

export function setMuted(value: boolean) {
  write(MUTED, value ? "1" : "0");
}

export function setReduced(value: boolean) {
  write(REDUCED, value ? "1" : "0");
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// A two-character string keeps the snapshot comparable by value.
const snapshot = () => `${isMuted() ? 1 : 0}${isReduced() ? 1 : 0}`;

export function usePrefs(): { muted: boolean; reduced: boolean } {
  const s = useSyncExternalStore(subscribe, snapshot, () => "00");
  return { muted: s[0] === "1", reduced: s[1] === "1" };
}
