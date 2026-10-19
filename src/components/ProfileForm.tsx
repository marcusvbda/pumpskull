"use client";

// Screen 3: nickname + avatar. Used to create a room (host) or to join one.

import { useState } from "react";
import { createRoom, joinRoom, leaveRoom } from "@/app/actions/room";
import { GAME } from "@/lib/game/config";
import { checkNickname } from "@/lib/game/nickname";
import { loadIdentity, saveIdentity, type Identity } from "@/lib/identity";
import { Avatar } from "./Avatar";
import { Button, ErrorText } from "./ui";

interface Props {
  mode: "create" | "join";
  pin?: string; // join only
  onBack?: () => void;
  onDone: (identity: Identity) => void;
}

export function ProfileForm({ mode, pin, onBack, onDone }: Props) {
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const check = checkNickname(nickname);
  const ready = check.ok && avatar !== null && !busy;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!check.ok || avatar === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === "create"
          ? await createRoom({ nickname: check.nickname, avatar })
          : await joinRoom({ pin: pin!, nickname: check.nickname, avatar });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      // Switching rooms from the same phone: leave the old one so it does not keep a ghost player.
      const old = loadIdentity();
      if (old && old.pin !== res.pin) void leaveRoom(old).catch(() => {});
      const identity = { pin: res.pin, playerId: res.playerId, token: res.token };
      saveIdentity(identity);
      onDone(identity);
    } catch {
      setError("Can't reach the game. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} className="min-h-11 px-0">
            ← Back
          </Button>
        ) : (
          <span />
        )}
        {mode === "join" && pin && <span className="text-sm font-bold text-indigo-200">Room {pin}</span>}
      </div>

      <h1 className="text-3xl font-black text-amber-400">{mode === "create" ? "Create a room" : "Join the game"}</h1>

      <label className="flex flex-col gap-1">
        <span className="font-bold">Your nickname</span>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={GAME.nicknameMax + 6}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="done"
          aria-describedby="nick-rules"
          className="min-h-12 rounded-2xl border-2 border-indigo-400 bg-indigo-950 px-4 text-lg font-bold text-white outline-none focus:border-amber-400"
        />
        <span id="nick-rules" className="text-sm text-indigo-200">
          {GAME.nicknameMin} to {GAME.nicknameMax} characters: letters, numbers, spaces, _ - .
        </span>
        {nickname !== "" && !check.ok && check.problem !== "length" && (
          <span className="text-sm font-semibold text-red-300">
            {check.problem === "chars" ? "Use only letters, numbers, spaces, _ - and ." : "Please pick a different nickname."}
          </span>
        )}
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-bold">Pick your avatar</legend>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: GAME.avatarCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAvatar(n)}
              aria-pressed={avatar === n}
              aria-label={`Avatar ${n}`}
              className={`flex aspect-square items-center justify-center rounded-2xl border-2 p-1 ${
                avatar === n ? "border-amber-400 bg-amber-400/20" : "border-indigo-700 bg-indigo-900/60"
              }`}
            >
              <Avatar n={n} size={48} className="h-full w-full" />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-2 bg-gradient-to-t from-indigo-950 via-indigo-950/95 to-transparent px-4 pt-4 pb-3">
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={!ready} className="w-full">
          {busy ? "One moment…" : mode === "create" ? "Create room" : "Join"}
        </Button>
      </div>
    </form>
  );
}
