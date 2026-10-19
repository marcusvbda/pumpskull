"use client";

// The player's id and secret token live in localStorage so a reload (or a locked phone) keeps them in the room.
// One identity per browser. Everything is wrapped in try/catch: private mode and blocked storage must not crash the game.

import { useSyncExternalStore } from "react";

export interface Identity {
  pin: string;
  playerId: string;
  token: string;
}

const KEY = "pumpskull:player";
const CHANGED = "pumpskull:identity";

// Fallback when localStorage is blocked: lives until the tab is reloaded.
let memory = "";

function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return memory;
  }
}

function parse(raw: string): Identity | null {
  try {
    const value = JSON.parse(raw) as Partial<Identity>;
    if (typeof value.pin === "string" && typeof value.playerId === "string" && typeof value.token === "string") {
      return { pin: value.pin, playerId: value.playerId, token: value.token };
    }
  } catch {
    // fall through
  }
  return null;
}

export function loadIdentity(): Identity | null {
  return parse(readRaw());
}

function write(raw: string) {
  memory = raw;
  try {
    if (raw) window.localStorage.setItem(KEY, raw);
    else window.localStorage.removeItem(KEY);
  } catch {
    // memory fallback above
  }
  window.dispatchEvent(new Event(CHANGED));
}

export function saveIdentity(identity: Identity) {
  write(JSON.stringify(identity));
}

export function clearIdentity() {
  write("");
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange); // another tab of the same browser
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// undefined while rendering on the server / before hydration, then the stored identity or null.
export function useStoredIdentity(): Identity | null | undefined {
  const raw = useSyncExternalStore(subscribe, readRaw, () => undefined);
  return raw === undefined ? undefined : parse(raw);
}
