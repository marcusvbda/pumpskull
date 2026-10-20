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
      className={`min-h-12 rounded-2xl border-2 px-2 py-2 text-base font-extrabold ${
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
    <div className="flex flex-col gap-4">
      {!isHost && <p className="rounded-xl bg-indigo-900/70 p-2 text-center text-sm font-bold text-indigo-100">Only the host phone can change the settings.</p>}
      <ErrorText>{error}</ErrorText>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-bold">Time per play</legend>
        <div className="grid grid-cols-4 gap-2">
          {GAME.timeOptionsMinutes.map((m) => (
            <Choice key={m} selected={settings.time_minutes === m} disabled={locked} onClick={() => change({ time_minutes: m })}>
              {m} min
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-bold">Difficulty</legend>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d) => (
            <Choice key={d} selected={settings.difficulty === d} disabled={locked} onClick={() => change({ difficulty: d })} className="flex flex-col items-center gap-0.5 leading-tight">
              <span aria-hidden className="text-2xl">{CANDY[d]}</span>
              <span className="text-sm">{DIFFICULTY[d].label}</span>
            </Choice>
          ))}
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-indigo-900/70 p-3">
          <Mascot difficulty={settings.difficulty} size={80} />
          <p className="text-sm text-indigo-100">
            <b>{level.label}</b>: {level.items} items, {level.decoys} {level.decoys === 1 ? "decoy" : "decoys"},{" "}
            {level.showNames ? "item names and “Try saying” hints shown." : "no text help. Describe it in real English!"}
          </p>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-bold">Rounds</legend>
        <div className="grid grid-cols-2 gap-2">
          {GAME.roundOptions.map((r) => (
            <Choice key={r} selected={settings.rounds === r} disabled={locked} onClick={() => change({ rounds: r })}>
              {r} rounds
            </Choice>
          ))}
        </div>
        <p className="text-sm text-indigo-200">Each round has 2 plays, so {settings.rounds * 2} plays in total.</p>
      </fieldset>
    </div>
  );
}
