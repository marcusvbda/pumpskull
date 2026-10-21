"use client";

// Screen 4: the host phone edits, the other phone sees the same screen read-only.

import { useState } from "react";
import { updateSettings } from "@/app/actions/room";
import { DIFFICULTY, GAME, type Difficulty } from "@/lib/game/config";
import { DIFFICULTIES } from "@/lib/game/room";
import type { Identity } from "@/lib/identity";
import type { RoomRow, RoomSettings } from "@/lib/supabase/types";
import { ErrorText, Mascot } from "./ui";

const CANDY: Record<Difficulty, string> = { easy: "🍫", medium: "🍬", hard: "🌶️" };

interface Props {
  room: RoomRow;
  isHost: boolean;
  identity: Identity;
  refresh: () => Promise<void>;
}

function Choice({ selected, disabled, onClick, children, className = "" }: {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-11 rounded-2xl border-2 px-2 py-1 text-base font-extrabold ${
        selected ? "border-amber-400 bg-amber-400 text-indigo-950" : "border-indigo-600 bg-indigo-900/70 text-white"
      } ${disabled && !selected ? "opacity-60" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export function SettingsPanel({ room, isHost, identity, refresh }: Props) {
  const { settings } = room;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = !isHost || busy;
  const level = DIFFICULTY[settings.difficulty];

  async function change(patch: Partial<RoomSettings>) {
    setBusy(true);
    setError(null);
    try {
      const res = await updateSettings({ ...identity, settings: patch });
      if (!res.ok) setError(res.message);
      await refresh();
    } catch {
      setError("Can't reach the game. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-2">
      {!isHost && <p className="rounded-xl bg-indigo-900/70 p-2 text-center text-sm font-bold text-indigo-100">Only the host phone can change the settings.</p>}
      <ErrorText>{error}</ErrorText>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-0.5 text-sm font-bold">Time per play</legend>
        <div className="grid grid-cols-4 gap-2">
          {GAME.timeOptionsMinutes.map((m) => (
            <Choice key={m} selected={settings.time_minutes === m} disabled={locked} onClick={() => change({ time_minutes: m })}>
              {m} min
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-0.5 text-sm font-bold">Difficulty</legend>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d) => (
            <Choice key={d} selected={settings.difficulty === d} disabled={locked} onClick={() => change({ difficulty: d })} className="flex flex-col items-center gap-0.5 leading-tight">
              <span aria-hidden className="text-xl leading-none">{CANDY[d]}</span>
              <span className="text-xs">{DIFFICULTY[d].label}</span>
            </Choice>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-indigo-900/70 p-2 [@media(max-height:620px)]:hidden">
          <Mascot difficulty={settings.difficulty} size={52} />
          <p className="text-xs text-indigo-100">
            <b>{level.label}</b>: {level.items} items, {level.decoys} {level.decoys === 1 ? "decoy" : "decoys"},{" "}
            {level.showNames ? "item names and “Try saying” hints shown." : "no text help. Describe it in real English!"}
          </p>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-0.5 text-sm font-bold">Rounds (2 plays each)</legend>
        <div className="grid grid-cols-2 gap-2">
          {GAME.roundOptions.map((r) => (
            <Choice key={r} selected={settings.rounds === r} disabled={locked} onClick={() => change({ rounds: r })}>
              {r} rounds
            </Choice>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
