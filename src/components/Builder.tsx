"use client";

// Screens 7A/7B: the empty scene and the tray. Drag items from the tray onto the scene, drag them again to
// move them, drag them off the scene to put them back. Pointer Events with touch-action: none, so the page
// never scrolls while dragging. Drag movement stays on this phone; only the result is saved (autosave every
// few seconds, on Finish and when the time is up).

import { useCallback, useEffect, useRef, useState } from "react";
import { savePlacement } from "@/app/actions/play";
import { findItem } from "@/data/items";
import { playSfx } from "@/lib/audio";
import { DIFFICULTY, GAME, PLAY, type Difficulty } from "@/lib/game/config";
import type { TrayEntry } from "@/lib/game/flow";
import type { PlacedItem } from "@/lib/game/scoring";
import type { Scene, Team } from "@/lib/game/types";
import type { Identity } from "@/lib/identity";
import { GameImage } from "./GameImage";
import { PlayHeader } from "./PlayHeader";
import { SceneItem, SceneView, anchorTransform } from "./SceneView";
import { Button, ErrorText, Shell } from "./ui";

interface Placed extends PlacedItem {
  key: number;
}

interface Drag {
  key: number | null; // null: a new item from the tray
  itemId: string;
  pointerId: number;
  clientX: number;
  clientY: number;
  offX: number; // from the pointer to the item's anchor point, in px
  offY: number;
}

interface Props {
  identity: Identity;
  play: number;
  scene: Scene;
  backgroundId: string;
  tray: TrayEntry[];
  initialPlaced: PlacedItem[];
  difficulty: Difficulty;
  team: Team;
  leftMs: number; // time left on the play timer
  plays: number;
}

export function Builder({ identity, play, scene, backgroundId, tray, initialPlaced, difficulty, team, leftMs, plays }: Props) {
  const level = DIFFICULTY[difficulty];
  const sceneRef = useRef<HTMLDivElement>(null);
  const nextKey = useRef(initialPlaced.length);
  const [placed, setPlaced] = useState<Placed[]>(() => initialPlaced.map((p, key) => ({ ...p, key })));
  const [drag, setDragState] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const setDrag = (d: Drag | null) => {
    dragRef.current = d;
    setDragState(d);
  };
  const [sceneWidth, setSceneWidth] = useState(0);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saving: what the server has, and whether the play is over for this phone.
  const latest = useRef(placed);
  const savedJson = useRef(JSON.stringify(initialPlaced));
  const over = useRef(false);

  useEffect(() => {
    latest.current = placed;
  }, [placed]);

  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setSceneWidth(el.getBoundingClientRect().width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const save = useCallback(
    async (finish: boolean) => {
      if (over.current) return;
      const items = latest.current.map(({ itemId, x, y }) => ({ itemId, x, y }));
      const json = JSON.stringify(items);
      if (!finish && json === savedJson.current) return;
      try {
        const res = await savePlacement({ ...identity, play, items, finish });
        if (res.ok) {
          savedJson.current = json;
          if (finish) over.current = true;
        } else if (res.error === "play_over") over.current = true;
        else setError(res.message);
      } catch {
        // offline for a moment: the next autosave tries again
      }
    },
    [identity, play],
  );

  // Autosave.
  useEffect(() => {
    const timer = setInterval(() => void save(false), GAME.builderAutosaveSeconds * 1000);
    return () => clearInterval(timer);
  }, [save]);

  // Time is up: send the last build. The server still accepts it for a few seconds after the timer.
  const timeUp = leftMs <= 0;
  useEffect(() => {
    if (timeUp) void save(true);
  }, [timeUp, save]);

  async function finish() {
    if (!confirmFinish) {
      setConfirmFinish(true);
      setTimeout(() => setConfirmFinish(false), 3000);
      return;
    }
    setSending(true);
    await save(true);
    setSending(false);
  }

  // ---------- dragging ----------

  const itemSize = sceneWidth * PLAY.builderItemScale;

  function startFromTray(event: React.PointerEvent, itemId: string) {
    if (drag || timeUp) return;
    event.preventDefault();
    const anchor = findItem(scene, itemId)?.anchor ?? "bottom";
    // The item appears just above the finger, so the finger does not hide it.
    setDrag({
      key: null,
      itemId,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      offX: 0,
      offY: anchor === "center" ? -itemSize / 2 : 0,
    });
  }

  function startFromScene(event: React.PointerEvent, item: Placed) {
    if (drag || timeUp) return;
    event.preventDefault();
    const rect = sceneRef.current!.getBoundingClientRect();
    setDrag({
      key: item.key,
      itemId: item.itemId,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      offX: rect.left + item.x * rect.width - event.clientX,
      offY: rect.top + item.y * rect.height - event.clientY,
    });
  }

  // Window listeners: the drag keeps working when the finger leaves the element it started on.
  const dragging = drag !== null;
  const pointerId = drag?.pointerId;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== pointerId) return;
      setDrag({ ...d, clientX: e.clientX, clientY: e.clientY });
    };
    const drop = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== pointerId) return;
      const rect = sceneRef.current?.getBoundingClientRect();
      const x = rect ? (e.clientX + d.offX - rect.left) / rect.width : -1;
      const y = rect ? (e.clientY + d.offY - rect.top) / rect.height : -1;
      // A cancelled pointer (the system took the touch) puts a moved item back where it was.
      const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      if (e.type === "pointercancel") {
        setDrag(null);
        return;
      }
      const key = d.key ?? nextKey.current++;
      if (inside) playSfx("drop");
      setPlaced((list) => {
        const rest = list.filter((p) => p.key !== key);
        return inside ? [...rest, { key, itemId: d.itemId, x, y }] : rest; // off the scene: back to the tray
      });
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", drop);
    window.addEventListener("pointercancel", drop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", drop);
      window.removeEventListener("pointercancel", drop);
    };
  }, [dragging, pointerId]);

  const used = new Map<string, number>();
  for (const p of placed) used.set(p.itemId, (used.get(p.itemId) ?? 0) + 1);
  if (drag && drag.key === null) used.set(drag.itemId, (used.get(drag.itemId) ?? 0) + 1);

  const dragItem = drag ? findItem(scene, drag.itemId) : undefined;

  return (
    <Shell>
      <PlayHeader team={team} role="builder" leftMs={leftMs} play={play} plays={plays} />

      <p className="text-center text-sm font-bold text-indigo-200">Listen to the other team and drag the items into the scene.</p>

      <SceneView scene={scene} backgroundId={backgroundId} sceneRef={sceneRef} className="touch-none border-4 border-teal-400">
        {placed.map((p) => (
          <SceneItem
            key={p.key}
            scene={scene}
            itemId={p.itemId}
            x={p.x}
            y={p.y}
            scale={PLAY.builderItemScale}
            hidden={drag?.key === p.key}
            onPointerDown={(e) => startFromScene(e, p)}
          />
        ))}
      </SceneView>

      <section aria-label="Items" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${level.trayColumns}, minmax(0, 1fr))` }}>
        {tray.map((entry) => {
          const item = findItem(scene, entry.itemId);
          const left = entry.count - (used.get(entry.itemId) ?? 0);
          const name = item?.name ?? entry.itemId;
          return (
            <button
              key={entry.itemId}
              type="button"
              disabled={left <= 0 || timeUp}
              onPointerDown={(e) => startFromTray(e, entry.itemId)}
              aria-label={`${name}, ${left} left`}
              className="relative flex touch-none flex-col items-center gap-1 rounded-2xl border-2 border-indigo-600 bg-indigo-900/70 p-1.5 select-none [-webkit-touch-callout:none] disabled:opacity-35"
            >
              <GameImage src={item?.sprite ?? ""} label={name} className="aspect-square w-full max-w-16" />
              {level.showNames && <span className="text-xs leading-tight font-bold">{name}</span>}
              {entry.count > 1 && (
                <span className="absolute top-0.5 right-0.5 min-w-6 rounded-full bg-amber-400 px-1 text-sm font-black text-indigo-950">{left}</span>
              )}
            </button>
          );
        })}
      </section>

      <div className="mt-auto flex flex-col gap-2">
        <ErrorText>{error}</ErrorText>
        {timeUp ? (
          <p className="rounded-2xl bg-indigo-900/70 p-3 text-center font-bold">Time&apos;s up! Counting the points…</p>
        ) : (
          <Button onClick={finish} disabled={sending} className="w-full text-xl">
            {sending ? "Sending…" : confirmFinish ? "Tap again to finish" : "Finish"}
          </Button>
        )}
      </div>

      {drag && dragItem !== undefined && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 aspect-square drop-shadow-xl"
          style={{
            left: drag.clientX + drag.offX,
            top: drag.clientY + drag.offY,
            width: itemSize,
            transform: anchorTransform(dragItem.anchor),
          }}
        >
          <GameImage src={dragItem.sprite} label={dragItem.name} className="h-full w-full" />
        </div>
      )}
    </Shell>
  );
}
