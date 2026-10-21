"use client";

// /dev/slots: pick a background, click to add slots, drag to move, choose type and scale, then copy or
// download the JSON into src/data/slots/<id>.json. Drafts are kept in this browser so a reload loses nothing.
// Allow about 10 minutes per background (spec section 6).

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BACKGROUNDS, backgroundSrc } from "@/data/backgrounds";
import { CATALOG } from "@/data/items";
import { clampSlot, exportBackground, nextSlotId, SLOT_COUNT, SLOT_SCALE, SLOT_TYPES, slotAnchor, slotIssues } from "@/lib/game/slots";
import type { Background, Slot, SlotType } from "@/lib/game/types";
import { GameImage } from "./GameImage";

const draftKey = (id: string) => `pumpskull:slots:${id}`;
const TYPE_COLOURS: Record<SlotType, string> = {
  step: "bg-amber-400",
  shelf: "bg-pink-400",
  floor: "bg-teal-400",
  wall: "bg-purple-400",
  door: "bg-orange-500",
  window: "bg-sky-400",
};

function loadDraft(bg: Background): Slot[] {
  try {
    const raw = window.localStorage.getItem(draftKey(bg.id));
    if (raw) return JSON.parse(raw) as Slot[];
  } catch {
    // blocked storage or bad JSON: start from the saved file
  }
  return bg.slots;
}

// Drafts live in localStorage, so the editor only renders in the browser (never on the server).
export function SlotEditor() {
  const inBrowser = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return inBrowser ? <Editor /> : null;
}

function Editor() {
  const [bgId, setBgId] = useState(BACKGROUNDS[0].id);
  const bg = BACKGROUNDS.find((b) => b.id === bgId)!;
  const [slots, setSlots] = useState<Slot[]>(() => loadDraft(BACKGROUNDS[0]));
  const [selected, setSelected] = useState<string | null>(null);
  const [type, setType] = useState<SlotType>("step");
  const [scale, setScale] = useState<number>(SLOT_SCALE.default);
  const [copied, setCopied] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; moved: boolean } | null>(null);

  // Switching background loads its draft (or the saved file).
  function chooseBackground(id: string) {
    const next = BACKGROUNDS.find((b) => b.id === id)!;
    setBgId(id);
    setSlots(loadDraft(next));
    setSelected(null);
  }

  function update(next: Slot[]) {
    setSlots(next);
    try {
      window.localStorage.setItem(draftKey(bgId), JSON.stringify(next));
    } catch {
      // no draft saving in private mode
    }
  }

  const draft: Background = useMemo(() => ({ ...bg, slots }), [bg, slots]);
  const issues = useMemo(() => slotIssues(draft), [draft]);
  const json = useMemo(() => exportBackground(draft), [draft]);
  const current = slots.find((s) => s.id === selected) ?? null;

  function pointOf(event: { clientX: number; clientY: number }): { x: number; y: number } {
    const box = sceneRef.current!.getBoundingClientRect();
    return { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height };
  }

  function addAt(event: React.PointerEvent) {
    if (event.target !== event.currentTarget) return; // a click on a slot is handled by the slot
    const id = nextSlotId(slots);
    update([...slots, clampSlot({ id, type, scale, ...pointOf(event) })]);
    setSelected(id);
  }

  function startDrag(event: React.PointerEvent, slot: Slot) {
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { id: slot.id, moved: false };
    setSelected(slot.id);
    setType(slot.type);
    setScale(slot.scale);
  }

  function moveDrag(event: React.PointerEvent) {
    if (!drag.current) return;
    drag.current.moved = true;
    const { x, y } = pointOf(event);
    const id = drag.current.id;
    update(slots.map((s) => (s.id === id ? clampSlot({ ...s, x, y }) : s)));
  }

  function patchSelected(patch: Partial<Slot>) {
    if (!current) return;
    update(slots.map((s) => (s.id === current.id ? clampSlot({ ...s, ...patch }) : s)));
  }

  function remove() {
    if (!current) return;
    update(slots.filter((s) => s.id !== current.id));
    setSelected(null);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // the textarea below can still be copied by hand
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bg.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const byType = SLOT_TYPES.map((t) => [t, slots.filter((s) => s.type === t).length] as const);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4 text-sm text-white">
      <h1 className="text-lg font-bold">Slot editor</h1>
      <p className="text-indigo-200">
        Click the picture to add a slot, drag a slot to move it. Save the result as <code>src/data/slots/{bg.id}.json</code>. Drafts stay in this browser.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select className="rounded bg-indigo-900 p-2" value={bgId} onChange={(e) => chooseBackground(e.target.value)} aria-label="Background">
          {BACKGROUNDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.id}
              {b.placeholder ? " (placeholder slots)" : ""}
            </option>
          ))}
        </select>
        <select
          className="rounded bg-indigo-900 p-2"
          value={type}
          onChange={(e) => {
            setType(e.target.value as SlotType);
            patchSelected({ type: e.target.value as SlotType });
          }}
          aria-label="Slot type"
        >
          {SLOT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="col-span-2 flex items-center gap-2 rounded bg-indigo-900 p-2">
          Scale {scale.toFixed(2)}
          <input
            type="range"
            min={SLOT_SCALE.min}
            max={SLOT_SCALE.max}
            step={0.005}
            value={scale}
            onChange={(e) => {
              setScale(Number(e.target.value));
              patchSelected({ scale: Number(e.target.value) });
            }}
            className="flex-1"
          />
        </label>
      </div>

      <div
        ref={sceneRef}
        onPointerDown={addAt}
        className="relative w-full cursor-crosshair touch-none overflow-hidden rounded-xl select-none"
        style={{ aspectRatio: "16 / 10" }}
      >
        <GameImage src={backgroundSrc(bg)} label={`${bg.id}: no image yet`} variant="scene" className="pointer-events-none absolute inset-0 h-full w-full" />
        {slots.map((s, i) => {
          const centre = slotAnchor(s.type) === "center";
          return (
            <div
              key={s.id}
              onPointerDown={(e) => startDrag(e, s)}
              onPointerMove={moveDrag}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
              className={`absolute aspect-square cursor-grab border-2 border-dashed ${selected === s.id ? "border-white bg-white/25" : "border-white/60 bg-black/20"}`}
              style={{
                left: `${s.x * 100}%`,
                top: `${s.y * 100}%`,
                width: `${s.scale * 100}%`,
                transform: centre ? "translate(-50%, -50%)" : "translate(-50%, -100%)",
              }}
              title={`${s.id} ${s.type}`}
            >
              <span className={`absolute ${centre ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : "bottom-0 left-1/2 translate-y-1/2 -translate-x-1/2"} flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black text-indigo-950 ${TYPE_COLOURS[s.type]}`}>
                {i + 1}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold">
          {slots.length} slots ({SLOT_COUNT.min} to {SLOT_COUNT.max})
        </span>
        {byType.map(([t, n]) => (
          <span key={t} className="flex items-center gap-1 rounded bg-indigo-900 px-2 py-1">
            <span className={`h-2.5 w-2.5 rounded-full ${TYPE_COLOURS[t]}`} /> {t} {n}
          </span>
        ))}
        {current ? (
          <button className="ml-auto rounded bg-red-500 px-3 py-1 font-bold" onClick={remove}>
            Delete {current.id}
          </button>
        ) : null}
      </div>

      {issues.length === 0 ? (
        <p className="rounded bg-green-900/60 p-2 font-bold text-green-200">Ready: every level can be generated on this background.</p>
      ) : (
        <ul className="list-disc rounded bg-red-950/60 p-2 pl-6 text-red-200">
          {issues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}

      <p className="text-indigo-200">
        Items in this scene: {CATALOG[bg.scene].items.map((i) => `${i.name} (${i.slotTypes.join("/")})`).join(", ")}.
      </p>

      <div className="flex gap-2">
        <button className="rounded bg-amber-500 px-3 py-2 font-bold text-indigo-950" onClick={copy}>
          {copied ? "Copied!" : "Copy JSON"}
        </button>
        <button className="rounded bg-indigo-600 px-3 py-2 font-bold" onClick={download}>
          Download {bg.id}.json
        </button>
        <button className="ml-auto rounded bg-indigo-900 px-3 py-2" onClick={() => update(bg.slots)}>
          Reset to saved file
        </button>
      </div>
      <textarea readOnly value={json} rows={10} className="rounded bg-indigo-950 p-2 font-mono text-xs" aria-label="Slot JSON" />
    </main>
  );
}
