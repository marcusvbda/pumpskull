import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type FakeDb, type Row } from "@/test/fakeSupabase";

const state = vi.hoisted(() => ({ db: undefined as unknown as FakeDb }));
vi.mock("@/lib/supabase/server", () => ({ supabaseAdmin: () => state.db }));

import { DIFFICULTY, PLAY } from "@/lib/game/config";
import { advanceTimer, getPlayView, nextPlay, savePlacement, type PlayView } from "./play";
import { createRoom, joinRoom, startGame, updateSettings } from "./room";

type Who = { pin: string; playerId: string; token: string };

const T0 = Date.parse("2026-11-02T10:00:00.000Z");
let now = T0;
const at = (ms: number) => {
  now = T0 + ms;
  vi.setSystemTime(now);
};

beforeEach(() => {
  state.db = createFakeDb();
  vi.useFakeTimers({ toFake: ["Date"] });
  at(0);
});

afterEach(() => {
  vi.useRealTimers();
});

const room = (pin: string) => state.db.tables.rooms.find((r) => r.pin === pin)!;
const rows = (table: string, pin: string) => state.db.tables[table].filter((r) => r.room_pin === pin);
const targetsOf = (pin: string, play: number) =>
  (rows("play_targets", pin).find((r) => r.play_idx === play)!.targets as { item_id: string; x: number; y: number }[]);

// Marigold (host) and Pumpkin, started, with time_minutes 2 so the numbers stay small.
async function startedGame(settings: object = { time_minutes: 2 }): Promise<{ marigold: Who; pumpkin: Who; pin: string }> {
  const created = await createRoom();
  if (!created.ok) throw new Error(created.error);
  const marigold = { pin: created.pin, playerId: created.playerId, token: created.token };
  const joined = await joinRoom({ pin: marigold.pin });
  if (!joined.ok) throw new Error(joined.error);
  const pumpkin = { pin: joined.pin, playerId: joined.playerId, token: joined.token };
  expect(await updateSettings({ ...marigold, settings })).toMatchObject({ ok: true });
  expect(await startGame(marigold)).toMatchObject({ ok: true });
  return { marigold, pumpkin, pin: marigold.pin };
}

async function toPlaying(who: Who, play = 0) {
  const started = Date.parse(room(who.pin).phase_started_at as string);
  at(started - T0 + 5000);
  expect(await advanceTimer({ ...who, phase: "countdown", play })).toMatchObject({ ok: true, changed: true });
}

async function view(who: Who): Promise<PlayView> {
  const res = await getPlayView(who);
  if (!res.ok) throw new Error(res.error);
  return res.view;
}

describe("startGame plans every play", () => {
  it("creates 2 plays per round, alternating the describing team", async () => {
    const { pin } = await startedGame({ rounds: 4 });
    const plays = rows("plays", pin).sort((a, b) => (a.idx as number) - (b.idx as number));
    expect(plays.map((p) => p.describer_team)).toEqual([1, 2, 1, 2, 1, 2, 1, 2]);
    expect(plays.map((p) => p.scene)).toEqual(["altar", "altar", "house", "house", "altar", "altar", "house", "house"]);
    expect(rows("play_targets", pin)).toHaveLength(8);
  });

  it("keeps the target out of every public table", async () => {
    const { pin } = await startedGame();
    const publicRows: Row[] = [...rows("plays", pin), room(pin), ...rows("players", pin), ...rows("play_results", pin)];
    const text = JSON.stringify(publicRows);
    for (const key of ["targets", "slot_id", "seed", "decoys"]) expect(text).not.toContain(key);
  });

  it("uses the difficulty for the number of items", async () => {
    const { pin } = await startedGame({ difficulty: "hard" });
    expect(targetsOf(pin, 0)).toHaveLength(DIFFICULTY.hard.items);
  });

  it("starts with the countdown of play 0", async () => {
    const { pin } = await startedGame();
    expect(room(pin)).toMatchObject({ status: "playing", phase: "countdown", current_play: 0 });
  });
});

describe("getPlayView", () => {
  it("gives the target only to the describing phone and the tray to the building phone", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    const describer = await view(marigold);
    expect(describer.role).toBe("describer");
    if (describer.role === "describer") expect(describer.targets).toHaveLength(DIFFICULTY.easy.items);

    const builder = await view(pumpkin);
    expect(builder.role).toBe("builder");
    expect(JSON.stringify(builder)).not.toMatch(/"x"|"y"|slot|seed|targets/);
    if (builder.role === "builder") {
      const placeable = builder.tray.reduce((n, t) => n + t.count, 0);
      expect(placeable).toBe(DIFFICULTY.easy.items + DIFFICULTY.easy.decoys);
      expect(builder.placed).toEqual([]);
    }
    expect(targetsOf(pin, 0)).toHaveLength(DIFFICULTY.easy.items);
  });

  it("gives the same tray on every call", async () => {
    const { pumpkin } = await startedGame();
    expect(await view(pumpkin)).toEqual(await view(pumpkin));
  });

  it("swaps roles on the next play", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toPlaying(marigold);
    await savePlacement({ ...pumpkin, play: 0, items: [], finish: true });
    expect(await nextPlay({ ...marigold, play: 0 })).toMatchObject({ ok: true, finished: false });
    expect(room(pin)).toMatchObject({ phase: "countdown", current_play: 1 });
    expect((await view(pumpkin)).role).toBe("describer");
    expect((await view(marigold)).role).toBe("builder");
  });

  it("refuses outside a play, and a wrong token", async () => {
    const created = await createRoom();
    if (!created.ok) throw new Error();
    expect(await getPlayView(created)).toMatchObject({ ok: false, error: "play_over" });
    expect(await getPlayView({ ...created, token: "x".repeat(32) })).toMatchObject({ error: "not_in_room" });
  });
});

describe("advanceTimer", () => {
  it("moves countdown to playing only after 3-2-1 and the role banner", async () => {
    const { marigold, pin } = await startedGame();
    const started = Date.parse(room(pin).phase_started_at as string);
    at(started - T0 + 3000);
    expect(await advanceTimer({ ...marigold, phase: "countdown", play: 0 })).toMatchObject({ changed: false });
    expect(room(pin).phase).toBe("countdown");
    at(started - T0 + 5000);
    expect(await advanceTimer({ ...marigold, phase: "countdown", play: 0 })).toMatchObject({ changed: true });
    // The play starts when the countdown ended, not when the phone asked.
    expect(room(pin)).toMatchObject({ phase: "playing", play_started_at: new Date(started + 5000).toISOString() });
  });

  it("moves only once when both phones ask", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toPlaying(marigold);
    expect(await advanceTimer({ ...pumpkin, phase: "countdown", play: 0 })).toMatchObject({ ok: true, changed: false });
    expect(room(pin).phase).toBe("playing");
  });

  it("ends the play after the timer plus the grace for the last save, and scores the last autosave", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toPlaying(marigold);
    const startedAt = Date.parse(room(pin).play_started_at as string) - T0;
    const first = targetsOf(pin, 0)[0];
    at(startedAt + 30_000);
    expect(await savePlacement({ ...pumpkin, play: 0, items: [{ itemId: first.item_id, x: first.x, y: first.y }] })).toMatchObject({ ok: true, ended: false });

    at(startedAt + 120_000 + 1000); // timer over, still inside the grace
    expect(await advanceTimer({ ...marigold, phase: "playing", play: 0 })).toMatchObject({ changed: false });
    at(startedAt + 120_000 + PLAY.finishGraceSeconds * 1000);
    expect(await advanceTimer({ ...marigold, phase: "playing", play: 0 })).toMatchObject({ changed: true });

    expect(room(pin).phase).toBe("reveal");
    const result = rows("play_results", pin)[0];
    expect((result.results as { total: number }).total).toBeGreaterThanOrEqual(1);
    expect(room(pin).spirit_meter).toBe(result.spirit_gain);
  });

  it("ignores a phone that saw an older phase", async () => {
    const { marigold, pin } = await startedGame();
    await toPlaying(marigold);
    expect(await advanceTimer({ ...marigold, phase: "countdown", play: 0 })).toMatchObject({ ok: true, changed: false });
    expect(room(pin).phase).toBe("playing");
  });

  it("scores again a reveal left without results, without counting it twice", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toPlaying(marigold);
    await savePlacement({ ...pumpkin, play: 0, items: [], finish: true });
    const meter = room(pin).spirit_meter;
    state.db.tables.play_results = [];
    room(pin).spirit_meter = 0;
    await advanceTimer({ ...pumpkin, phase: "reveal", play: 0 });
    await advanceTimer({ ...marigold, phase: "reveal", play: 0 });
    expect(rows("play_results", pin)).toHaveLength(1);
    expect(room(pin).spirit_meter).toBe(meter);
  });
});

describe("savePlacement", () => {
  it("only accepts the building phone, during the play", async () => {
    const { marigold, pumpkin } = await startedGame();
    expect(await savePlacement({ ...pumpkin, play: 0, items: [] })).toMatchObject({ error: "play_over" }); // still counting down
    await toPlaying(marigold);
    expect(await savePlacement({ ...marigold, play: 0, items: [] })).toMatchObject({ error: "not_allowed" });
    expect(await savePlacement({ ...pumpkin, play: 1, items: [] })).toMatchObject({ error: "play_over" });
    expect(await savePlacement({ ...pumpkin, play: 0, items: [] })).toMatchObject({ ok: true });
  });

  it("keeps the build for a reload of the building phone", async () => {
    const { marigold, pumpkin } = await startedGame();
    await toPlaying(marigold);
    const tray = await view(pumpkin);
    if (tray.role !== "builder") throw new Error();
    const items = [{ itemId: tray.tray[0].itemId, x: 0.25, y: 0.5 }];
    await savePlacement({ ...pumpkin, play: 0, items });
    await savePlacement({ ...pumpkin, play: 0, items: [...items, { itemId: tray.tray[1].itemId, x: 0.75, y: 0.5 }] });
    const again = await view(pumpkin);
    expect(again.role === "builder" && again.placed).toHaveLength(2);
  });

  it("refuses saves after the grace, and garbage payloads", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toPlaying(marigold);
    expect(await savePlacement({ ...pumpkin, play: 0, items: "lots" as never })).toMatchObject({ error: "invalid_request" });
    expect(await savePlacement({ ...pumpkin, play: "0" as never, items: [] })).toMatchObject({ error: "invalid_request" });
    const startedAt = Date.parse(room(pin).play_started_at as string) - T0;
    at(startedAt + 120_000 + PLAY.finishGraceSeconds * 1000 + 1);
    expect(await savePlacement({ ...pumpkin, play: 0, items: [] })).toMatchObject({ error: "play_over" });
  });

  it("Finish ends the play at once and a perfect build scores every item", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toPlaying(marigold);
    const items = targetsOf(pin, 0).map((t) => ({ itemId: t.item_id, x: t.x, y: t.y }));
    expect(await savePlacement({ ...pumpkin, play: 0, items, finish: true })).toMatchObject({ ok: true, ended: true });
    expect(room(pin).phase).toBe("reveal");
    const result = rows("play_results", pin)[0].results as { total: number; items: { score: number }[] };
    expect(result.total).toBe(DIFFICULTY.easy.items);
    expect(result.items.every((i) => i.score === 1)).toBe(true);
    expect(await savePlacement({ ...pumpkin, play: 0, items: [] })).toMatchObject({ error: "play_over" });
  });

  it("ignores tampered extra copies and items that are not in the tray", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toPlaying(marigold);
    const t = targetsOf(pin, 0)[0];
    const spam = Array.from({ length: 10 }, () => ({ itemId: t.item_id, x: t.x, y: t.y }));
    await savePlacement({ ...pumpkin, play: 0, items: [...spam, { itemId: "not-an-item", x: 0.5, y: 0.5 }], finish: true });
    const saved = rows("placements", pin)[0].items as unknown[];
    const copies = targetsOf(pin, 0).filter((x) => x.item_id === t.item_id).length;
    expect(saved).toHaveLength(copies);
  });
});

describe("nextPlay", () => {
  it("is host only, and only from the reveal", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    expect(await nextPlay({ ...marigold, play: 0 })).toMatchObject({ error: "play_over" });
    await toPlaying(marigold);
    await savePlacement({ ...pumpkin, play: 0, items: [], finish: true });
    expect(await nextPlay({ ...pumpkin, play: 0 })).toMatchObject({ error: "not_host" });
    expect(room(pin).phase).toBe("reveal");
  });

  it("cannot skip two plays with a double tap", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toPlaying(marigold);
    await savePlacement({ ...pumpkin, play: 0, items: [], finish: true });
    expect(await nextPlay({ ...marigold, play: 0 })).toMatchObject({ ok: true });
    expect(await nextPlay({ ...marigold, play: 0 })).toMatchObject({ ok: false, error: "play_over" });
    expect(room(pin).current_play).toBe(1);
  });

  it("finishes the game after the last play and adds every play to the Spirit Meter", async () => {
    const { marigold, pumpkin, pin } = await startedGame(); // 2 rounds = 4 plays
    for (let play = 0; play < 4; play++) {
      const builder = play % 2 === 0 ? pumpkin : marigold;
      await toPlaying(marigold, play);
      const items = targetsOf(pin, play).map((t) => ({ itemId: t.item_id, x: t.x, y: t.y }));
      expect(await savePlacement({ ...builder, play, items, finish: true })).toMatchObject({ ok: true, ended: true });
      expect(await nextPlay({ ...marigold, play })).toMatchObject({ ok: true, finished: play === 3 });
    }
    expect(room(pin)).toMatchObject({ phase: "finished", status: "finished" });
    expect(room(pin).spirit_meter).toBe(4 * DIFFICULTY.easy.items);
  });
});
