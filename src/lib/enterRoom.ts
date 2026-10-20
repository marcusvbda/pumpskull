"use client";

// Creates a room (no pin) or joins one, then stores this phone's identity. Used by the entry screen and by
// the join card on /room/[pin] (a shared link).

import { createRoom, joinRoom, leaveRoom } from "@/app/actions/room";
import { loadIdentity, saveIdentity, type Identity } from "./identity";

export type EnterResult = { ok: true; identity: Identity } | { ok: false; message: string };

export async function enterRoom(pin?: string): Promise<EnterResult> {
  try {
    const res = pin === undefined ? await createRoom() : await joinRoom({ pin });
    if (!res.ok) return { ok: false, message: res.message };
    // Switching rooms from the same phone: leave the old one so it does not keep a team seat busy.
    const old = loadIdentity();
    if (old && old.pin !== res.pin) void leaveRoom(old).catch(() => {});
    const identity = { pin: res.pin, playerId: res.playerId, token: res.token };
    saveIdentity(identity);
    return { ok: true, identity };
  } catch {
    return { ok: false, message: "Can't reach the game. Check your connection and try again." };
  }
}
