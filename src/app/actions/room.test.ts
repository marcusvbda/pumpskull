import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type FakeDb } from "@/test/fakeSupabase";

const state = vi.hoisted(() => ({ db: undefined as unknown as FakeDb }));
vi.mock("@/lib/supabase/server", () => ({ supabaseAdmin: () => state.db }));

import { createRoom, heartbeat, joinRoom, leaveRoom, startGame, updateSettings } from "./room";

type Who = { pin: string; playerId: string; token: string };

beforeEach(() => {
  state.db = createFakeDb();
});

async function newRoom(): Promise<Who> {
  const res = await createRoom();
  if (!res.ok) throw new Error(res.error);
  return { pin: res.pin, playerId: res.playerId, token: res.token };
}

async function join(pin: string): Promise<Who> {
  const res = await joinRoom({ pin });
  if (!res.ok) throw new Error(res.error);
  return { pin: res.pin, playerId: res.playerId, token: res.token };
}

// A room with both team phones: Marigold (host) and Pumpkin.
async function fullRoom(): Promise<{ host: Who; guest: Who }> {
  const host = await newRoom();
  return { host, guest: await join(host.pin) };
}

const phones = (pin: string) => state.db.tables.players.filter((p) => p.room_pin === pin);
const room = (pin: string) => state.db.tables.rooms.find((r) => r.pin === pin)!;
const teamOf = (who: Who) => phones(who.pin).find((p) => p.id === who.playerId)?.team;

describe("createRoom", () => {
  it("makes a room with a 4-digit PIN, the host phone as Team Marigold, and defaults", async () => {
    const res = await createRoom();
    expect(res).toMatchObject({ ok: true, team: 1 });
    const who = res as Who;
    expect(who.pin).toMatch(/^\d{4}$/);
    expect(room(who.pin).host_id).toBe(who.playerId);
    expect(room(who.pin).status).toBe("lobby");
    expect(room(who.pin).settings).toEqual({ time_minutes: 4, difficulty: "easy", rounds: 2 });
    expect(phones(who.pin)).toHaveLength(1);
    expect(teamOf(who)).toBe(1);
  });

  it("stores no personal data for the phone", async () => {
    const who = await newRoom();
    expect(Object.keys(phones(who.pin)[0]).sort()).toEqual(["id", "joined_at", "last_seen", "room_pin", "team"]);
  });

  it("keeps the secret token only in player_tokens", async () => {
    const who = await newRoom();
    expect(state.db.tables.player_tokens).toEqual([{ player_id: who.playerId, token: who.token }]);
    expect(who.token.length).toBeGreaterThanOrEqual(24);
    expect(JSON.stringify(state.db.tables.rooms) + JSON.stringify(state.db.tables.players)).not.toContain(who.token);
  });

  it("skips a PIN that is already taken", async () => {
    const first = await newRoom();
    const rolls = [Number(first.pin) / 10000 + 0.00001, Number(first.pin) / 10000 + 0.00001, 0.5]; // two clashes, then 5000
    const random = vi.spyOn(Math, "random").mockImplementation(() => rolls.shift() ?? 0.123);
    const second = await newRoom();
    random.mockRestore();
    expect(second.pin).not.toBe(first.pin);
    expect(state.db.tables.rooms).toHaveLength(2);
  });

  it("gives up with a clear error when no PIN is free", async () => {
    const first = await newRoom();
    const same = Number(first.pin) / 10000 + 0.00001;
    const random = vi.spyOn(Math, "random").mockReturnValue(same);
    const res = await createRoom();
    random.mockRestore();
    expect(res).toMatchObject({ ok: false, error: "no_pin" });
  });

  it("sweeps rooms older than 24 hours", async () => {
    const old = await newRoom();
    room(old.pin).created_at = new Date(Date.now() - 25 * 3600_000).toISOString();
    await newRoom();
    expect(state.db.tables.rooms.some((r) => r.pin === old.pin)).toBe(false);
    expect(phones(old.pin)).toHaveLength(0);
  });
});

describe("joinRoom", () => {
  it("makes the second phone Team Pumpkin and returns its token", async () => {
    const host = await newRoom();
    const res = await joinRoom({ pin: host.pin });
    expect(res).toMatchObject({ ok: true, team: 2 });
    const guest = res as Who;
    expect(phones(host.pin)).toHaveLength(2);
    expect(state.db.tables.player_tokens.find((t) => t.player_id === guest.playerId)?.token).toBe(guest.token);
  });

  it("refuses an unknown or malformed PIN", async () => {
    expect(await joinRoom({ pin: "9999" })).toMatchObject({ error: "unknown_pin" });
    expect(await joinRoom({ pin: "99" })).toMatchObject({ error: "invalid_pin" });
    expect(await joinRoom(null as never)).toMatchObject({ error: "invalid_pin" });
  });

  it("refuses a third phone", async () => {
    const { host } = await fullRoom();
    expect(await joinRoom({ pin: host.pin })).toMatchObject({ ok: false, error: "room_full" });
    expect(phones(host.pin)).toHaveLength(2);
  });

  it("gives Team Marigold to a new phone when the Marigold phone left", async () => {
    const { host, guest } = await fullRoom();
    await leaveRoom(host);
    const res = await joinRoom({ pin: host.pin });
    expect(res).toMatchObject({ ok: true, team: 1 });
    expect(teamOf(guest)).toBe(2);
  });

  it("lets only one of two phones in when they join at the same moment", async () => {
    const host = await newRoom();
    const original = state.db.from.bind(state.db);
    state.db.from = ((table: string) => {
      const builder = original(table);
      if (table !== "players") return builder;
      const insert = builder.insert;
      builder.insert = ((row: never) => {
        state.db.from = original as typeof state.db.from; // only the first insert races
        state.db.tables.players.push({ id: "00000000-0000-4000-8000-0000000000ff", room_pin: host.pin, team: 2, joined_at: "2026-10-20T11:00:00.000Z" });
        return insert(row);
      }) as typeof builder.insert;
      return builder;
    }) as typeof state.db.from;
    expect(await joinRoom({ pin: host.pin })).toMatchObject({ ok: false, error: "room_full" });
    expect(phones(host.pin)).toHaveLength(2);
    expect(state.db.tables.player_tokens).toHaveLength(1); // no token left behind for the refused phone
  });

  it("refuses once the game has started", async () => {
    const { host, guest } = await fullRoom();
    expect(await startGame(host)).toMatchObject({ ok: true });
    await leaveRoom(guest);
    expect(await joinRoom({ pin: host.pin })).toMatchObject({ error: "game_started" });
  });
});

describe("updateSettings", () => {
  it("lets the host change one setting at a time", async () => {
    const host = await newRoom();
    expect(await updateSettings({ ...host, settings: { difficulty: "hard" } })).toMatchObject({ ok: true });
    expect(await updateSettings({ ...host, settings: { time_minutes: 2 } })).toMatchObject({ ok: true });
    expect(await updateSettings({ ...host, settings: { rounds: 4 } })).toMatchObject({ ok: true });
    expect(room(host.pin).settings).toEqual({ time_minutes: 2, difficulty: "hard", rounds: 4 });
  });

  it("refuses the other phone, even with its own valid token", async () => {
    const { host, guest } = await fullRoom();
    expect(await updateSettings({ ...guest, settings: { rounds: 4 } })).toMatchObject({ ok: false, error: "not_host" });
    expect(room(host.pin).settings).toMatchObject({ rounds: 2 });
  });

  it("refuses a wrong or stolen token", async () => {
    const { host, guest } = await fullRoom();
    const forged = { ...host, token: "x".repeat(32) };
    expect(await updateSettings({ ...forged, settings: { rounds: 4 } })).toMatchObject({ error: "not_in_room" });
    // The guest's token with the host's player id does not work either.
    expect(await updateSettings({ ...host, token: guest.token, settings: { rounds: 4 } })).toMatchObject({ error: "not_in_room" });
    expect(room(host.pin).settings).toMatchObject({ rounds: 2 });
  });

  it("refuses a host token used on another room", async () => {
    const a = await newRoom();
    const b = await newRoom();
    expect(await updateSettings({ ...a, pin: b.pin, settings: { rounds: 4 } })).toMatchObject({ error: "not_in_room" });
  });

  it("refuses values outside the allowed lists", async () => {
    const host = await newRoom();
    for (const settings of [{ time_minutes: 1 }, { time_minutes: 6 }, { difficulty: "extreme" }, { rounds: 3 }, {}]) {
      expect(await updateSettings({ ...host, settings } as never), JSON.stringify(settings)).toMatchObject({ error: "invalid_settings" });
    }
    expect(room(host.pin).settings).toEqual({ time_minutes: 4, difficulty: "easy", rounds: 2 });
  });

  it("is locked once the game started", async () => {
    const { host } = await fullRoom();
    await startGame(host);
    expect(await updateSettings({ ...host, settings: { rounds: 4 } })).toMatchObject({ error: "game_started" });
  });
});

describe("startGame", () => {
  it("refuses the other phone", async () => {
    const { host, guest } = await fullRoom();
    expect(await startGame(guest)).toMatchObject({ ok: false, error: "not_host" });
    expect(room(host.pin).status).toBe("lobby");
  });

  it("refuses a wrong token", async () => {
    const { host } = await fullRoom();
    expect(await startGame({ ...host, token: "y".repeat(32) })).toMatchObject({ error: "not_in_room" });
    expect(room(host.pin).status).toBe("lobby");
  });

  it("stays locked until both team phones are in", async () => {
    const host = await newRoom();
    expect(await startGame(host)).toMatchObject({ ok: false, error: "need_phones" });
    expect(room(host.pin).status).toBe("lobby");
    await join(host.pin);
    expect(await startGame(host)).toMatchObject({ ok: true });
  });

  it("leaves the lobby: status playing, phase countdown", async () => {
    const { host } = await fullRoom();
    await startGame(host);
    expect(room(host.pin)).toMatchObject({ status: "playing", phase: "countdown", current_play: 0 });
  });

  it("cannot start twice", async () => {
    const { host } = await fullRoom();
    expect(await startGame(host)).toMatchObject({ ok: true });
    expect(await startGame(host)).toMatchObject({ ok: false, error: "game_started" });
  });
});

describe("leaveRoom and host handover", () => {
  it("passes the crown to the other phone when the host leaves", async () => {
    const { host, guest } = await fullRoom();
    expect(await leaveRoom(host)).toMatchObject({ ok: true, roomClosed: false });
    expect(room(host.pin).host_id).toBe(guest.playerId);
    expect(phones(host.pin)).toHaveLength(1);
    expect(state.db.tables.player_tokens.some((t) => t.player_id === host.playerId)).toBe(false);
  });

  it("keeps the host when the other phone leaves, and frees its team", async () => {
    const { host, guest } = await fullRoom();
    await leaveRoom(guest);
    expect(room(host.pin).host_id).toBe(host.playerId);
    expect(await joinRoom({ pin: host.pin })).toMatchObject({ ok: true, team: 2 });
  });

  it("closes the room when the last phone leaves", async () => {
    const host = await newRoom();
    expect(await leaveRoom(host)).toMatchObject({ ok: true, roomClosed: true });
    expect(state.db.tables.rooms).toHaveLength(0);
    expect(state.db.tables.player_tokens).toHaveLength(0);
  });

  it("refuses a wrong token", async () => {
    const { host } = await fullRoom();
    expect(await leaveRoom({ ...host, token: "z".repeat(32) })).toMatchObject({ error: "not_in_room" });
    expect(phones(host.pin)).toHaveLength(2);
  });

  it("the new host can start once a phone takes the free team", async () => {
    const { host, guest } = await fullRoom();
    await leaveRoom(host);
    await join(host.pin);
    expect(await startGame(guest)).toMatchObject({ ok: true });
  });
});

describe("heartbeat", () => {
  it("updates last_seen", async () => {
    const host = await newRoom();
    const before = phones(host.pin)[0].last_seen;
    expect(await heartbeat(host)).toMatchObject({ ok: true });
    expect(phones(host.pin)[0].last_seen).not.toBe(before);
  });

  it("refuses a wrong token, a wrong room and a removed phone", async () => {
    const { host, guest } = await fullRoom();
    const other = await newRoom();
    expect(await heartbeat({ ...host, token: "q".repeat(32) })).toMatchObject({ error: "not_in_room" });
    expect(await heartbeat({ ...host, pin: other.pin })).toMatchObject({ error: "not_in_room" });
    await leaveRoom(guest);
    expect(await heartbeat(guest)).toMatchObject({ error: "not_in_room" });
  });

  it("rejects garbage input without touching the database", async () => {
    expect(await heartbeat({ pin: "1234", playerId: "not-a-uuid", token: "t".repeat(32) })).toMatchObject({ error: "invalid_request" });
    expect(await heartbeat(null as never)).toMatchObject({ error: "invalid_request" });
  });
});
