import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type FakeDb } from "@/test/fakeSupabase";

const state = vi.hoisted(() => ({ db: undefined as unknown as FakeDb }));
vi.mock("@/lib/supabase/server", () => ({ supabaseAdmin: () => state.db }));

import { GAME } from "@/lib/game/config";
import { createRoom, heartbeat, joinRoom, leaveRoom, startGame, updateSettings } from "./room";

type Who = { pin: string; playerId: string; token: string };

beforeEach(() => {
  state.db = createFakeDb();
});

async function newRoom(nickname = "Host"): Promise<Who> {
  const res = await createRoom({ nickname, avatar: 1 });
  if (!res.ok) throw new Error(res.error);
  return { pin: res.pin, playerId: res.playerId, token: res.token };
}

async function join(pin: string, nickname: string): Promise<Who> {
  const res = await joinRoom({ pin, nickname, avatar: 2 });
  if (!res.ok) throw new Error(`${nickname}: ${res.error}`);
  return { pin: res.pin, playerId: res.playerId, token: res.token };
}

const players = (pin: string) => state.db.tables.players.filter((p) => p.room_pin === pin);
const room = (pin: string) => state.db.tables.rooms.find((r) => r.pin === pin)!;
const teamSizes = (pin: string) => [1, 2].map((t) => players(pin).filter((p) => p.team === t).length);

describe("createRoom", () => {
  it("makes a room with a 4-digit PIN, a host player and defaults", async () => {
    const who = await newRoom("Vini");
    expect(who.pin).toMatch(/^\d{4}$/);
    expect(room(who.pin).host_id).toBe(who.playerId);
    expect(room(who.pin).status).toBe("lobby");
    expect(room(who.pin).settings).toEqual({ time_minutes: 4, difficulty: "easy", rounds: 2 });
    expect(players(who.pin)).toHaveLength(1);
    expect(players(who.pin)[0]).toMatchObject({ nickname: "Vini", avatar: 1 });
  });

  it("keeps the secret token only in player_tokens", async () => {
    const who = await newRoom();
    expect(state.db.tables.player_tokens).toEqual([{ player_id: who.playerId, token: who.token }]);
    expect(who.token.length).toBeGreaterThanOrEqual(24);
    expect(JSON.stringify(state.db.tables.rooms) + JSON.stringify(state.db.tables.players)).not.toContain(who.token);
  });

  it("skips a PIN that is already taken", async () => {
    const first = await newRoom("One");
    const rolls = [Number(first.pin) / 10000 + 0.00001, Number(first.pin) / 10000 + 0.00001, 0.5]; // two clashes, then 5000
    const random = vi.spyOn(Math, "random").mockImplementation(() => rolls.shift() ?? 0.123);
    const second = await newRoom("Two");
    random.mockRestore();
    expect(second.pin).not.toBe(first.pin);
    expect(state.db.tables.rooms).toHaveLength(2);
  });

  it("gives up with a clear error when no PIN is free", async () => {
    const first = await newRoom("One");
    const same = Number(first.pin) / 10000 + 0.00001;
    const random = vi.spyOn(Math, "random").mockReturnValue(same);
    const res = await createRoom({ nickname: "Two", avatar: 1 });
    random.mockRestore();
    expect(res).toMatchObject({ ok: false, error: "no_pin" });
  });

  it("sweeps rooms older than 24 hours", async () => {
    const old = await newRoom("Old");
    room(old.pin).created_at = new Date(Date.now() - 25 * 3600_000).toISOString();
    await newRoom("New");
    expect(state.db.tables.rooms.some((r) => r.pin === old.pin)).toBe(false);
    expect(players(old.pin)).toHaveLength(0);
  });

  it("validates the host's nickname and avatar", async () => {
    expect(await createRoom({ nickname: "x", avatar: 1 })).toMatchObject({ error: "nickname_length" });
    expect(await createRoom({ nickname: "Fuck", avatar: 1 })).toMatchObject({ error: "nickname_bad" });
    expect(await createRoom({ nickname: "Vini", avatar: 99 })).toMatchObject({ error: "invalid_avatar" });
    expect(await createRoom({ nickname: 5, avatar: 1 } as never)).toMatchObject({ ok: false });
    expect(state.db.tables.rooms).toHaveLength(0);
  });
});

describe("joinRoom", () => {
  it("adds a player and returns their token", async () => {
    const host = await newRoom();
    const guest = await join(host.pin, "Ana");
    expect(players(host.pin)).toHaveLength(2);
    expect(state.db.tables.player_tokens.find((t) => t.player_id === guest.playerId)?.token).toBe(guest.token);
  });

  it("refuses an unknown or malformed PIN", async () => {
    expect(await joinRoom({ pin: "9999", nickname: "Ana", avatar: 1 })).toMatchObject({ error: "unknown_pin" });
    expect(await joinRoom({ pin: "99", nickname: "Ana", avatar: 1 })).toMatchObject({ error: "invalid_pin" });
  });

  it("checks nickname length: 2 to 12", async () => {
    const { pin } = await newRoom();
    expect(await joinRoom({ pin, nickname: "A", avatar: 1 })).toMatchObject({ error: "nickname_length" });
    expect(await joinRoom({ pin, nickname: "Abcdefghijklm", avatar: 1 })).toMatchObject({ error: "nickname_length" });
    expect(await joinRoom({ pin, nickname: "Abcdefghijkl", avatar: 1 })).toMatchObject({ ok: true });
  });

  it("refuses a duplicate nickname, ignoring case and spaces", async () => {
    const { pin } = await newRoom("Vini");
    expect(await joinRoom({ pin, nickname: "vini", avatar: 1 })).toMatchObject({ error: "nickname_taken" });
    expect(await joinRoom({ pin, nickname: "  VINI ", avatar: 1 })).toMatchObject({ error: "nickname_taken" });
    expect(players(pin)).toHaveLength(1);
  });

  it("allows the same nickname in another room", async () => {
    await newRoom("Vini");
    const other = await newRoom("Other");
    expect(await joinRoom({ pin: other.pin, nickname: "Vini", avatar: 1 })).toMatchObject({ ok: true });
  });

  it("refuses bad words", async () => {
    const { pin } = await newRoom();
    expect(await joinRoom({ pin, nickname: "sh1t", avatar: 1 })).toMatchObject({ error: "nickname_bad" });
  });

  it("accepts avatars 1 to 50 and nothing else", async () => {
    const { pin } = await newRoom();
    expect(await joinRoom({ pin, nickname: "Zero", avatar: 0 })).toMatchObject({ error: "invalid_avatar" });
    expect(await joinRoom({ pin, nickname: "Over", avatar: 51 })).toMatchObject({ error: "invalid_avatar" });
    expect(await joinRoom({ pin, nickname: "Half", avatar: 2.5 })).toMatchObject({ error: "invalid_avatar" });
    expect(await joinRoom({ pin, nickname: "Last", avatar: 50 })).toMatchObject({ ok: true });
    expect(await joinRoom({ pin, nickname: "First", avatar: 1 })).toMatchObject({ ok: true });
  });

  it("keeps the teams within 1 player and refuses the 21st player", async () => {
    const { pin } = await newRoom("P0");
    for (let i = 1; i < GAME.maxPlayers; i++) {
      await join(pin, `P${i}`);
      const [a, b] = teamSizes(pin);
      expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
    }
    expect(teamSizes(pin)).toEqual([10, 10]);
    expect(await joinRoom({ pin, nickname: "Late", avatar: 1 })).toMatchObject({ ok: false, error: "room_full" });
    expect(players(pin)).toHaveLength(20);
  });

  it("puts a newcomer in the smaller team after players left", async () => {
    const host = await newRoom("P0");
    const joined = [];
    for (let i = 1; i < 6; i++) joined.push(await join(host.pin, `P${i}`));
    // Remove players from team 2 until it is clearly smaller.
    for (const who of joined.filter((j) => players(host.pin).find((p) => p.id === j.playerId)?.team === 2)) await leaveRoom(who);
    const [a, b] = teamSizes(host.pin);
    expect(a).toBeGreaterThan(b);
    await join(host.pin, "Newbie");
    expect(teamSizes(host.pin)[1]).toBe(b + 1);
  });

  it("backs out when another phone took the last seat at the same moment", async () => {
    const { pin } = await newRoom("P0");
    for (let i = 1; i < 19; i++) await join(pin, `P${i}`); // 19 players: the checks will see a free seat
    const original = state.db.from.bind(state.db);
    state.db.from = ((table: string) => {
      const builder = original(table);
      if (table !== "players") return builder;
      const insert = builder.insert;
      builder.insert = ((row: never) => {
        state.db.from = original as typeof state.db.from; // only the first insert races
        state.db.tables.players.push({ id: "00000000-0000-4000-8000-0000000000ff", room_pin: pin, nickname: "Sneaky", avatar: 1, team: 1, joined_at: "2026-10-20T11:00:00.000Z" });
        return insert(row);
      }) as typeof builder.insert;
      return builder;
    }) as typeof state.db.from;
    const res = await joinRoom({ pin, nickname: "Racer", avatar: 1 });
    expect(res).toMatchObject({ ok: false, error: "room_full" });
    expect(players(pin)).toHaveLength(GAME.maxPlayers);
    expect(players(pin).some((p) => p.nickname === "Racer")).toBe(false);
  });

  it("refuses once the game has started", async () => {
    const host = await newRoom();
    await join(host.pin, "Ana");
    expect(await startGame(host)).toMatchObject({ ok: true });
    expect(await joinRoom({ pin: host.pin, nickname: "Late", avatar: 1 })).toMatchObject({ error: "game_started" });
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

  it("refuses everyone else, even with their own valid token", async () => {
    const host = await newRoom();
    const guest = await join(host.pin, "Ana");
    expect(await updateSettings({ ...guest, settings: { rounds: 4 } })).toMatchObject({ ok: false, error: "not_host" });
    expect(room(host.pin).settings).toMatchObject({ rounds: 2 });
  });

  it("refuses a wrong or stolen token", async () => {
    const host = await newRoom();
    const guest = await join(host.pin, "Ana");
    const forged = { ...host, token: "x".repeat(32) };
    expect(await updateSettings({ ...forged, settings: { rounds: 4 } })).toMatchObject({ error: "not_in_room" });
    // The guest's token with the host's player id does not work either.
    expect(await updateSettings({ ...host, token: guest.token, settings: { rounds: 4 } })).toMatchObject({ error: "not_in_room" });
    expect(room(host.pin).settings).toMatchObject({ rounds: 2 });
  });

  it("refuses a host token used on another room", async () => {
    const a = await newRoom("HostA");
    const b = await newRoom("HostB");
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
    const host = await newRoom();
    await join(host.pin, "Ana");
    await startGame(host);
    expect(await updateSettings({ ...host, settings: { rounds: 4 } })).toMatchObject({ error: "game_started" });
  });
});

describe("startGame", () => {
  it("refuses everyone but the host", async () => {
    const host = await newRoom();
    const guest = await join(host.pin, "Ana");
    expect(await startGame(guest)).toMatchObject({ ok: false, error: "not_host" });
    expect(room(host.pin).status).toBe("lobby");
  });

  it("refuses a wrong token", async () => {
    const host = await newRoom();
    await join(host.pin, "Ana");
    expect(await startGame({ ...host, token: "y".repeat(32) })).toMatchObject({ error: "not_in_room" });
    expect(room(host.pin).status).toBe("lobby");
  });

  it("stays locked until each team has a player", async () => {
    const host = await newRoom();
    expect(await startGame(host)).toMatchObject({ ok: false, error: "need_players" });
    expect(room(host.pin).status).toBe("lobby");
    await join(host.pin, "Ana");
    expect(teamSizes(host.pin)).toEqual([1, 1]); // the second player always lands in the other team
    expect(await startGame(host)).toMatchObject({ ok: true });
  });

  it("leaves the lobby: status playing, phase countdown", async () => {
    const host = await newRoom();
    await join(host.pin, "Ana");
    await startGame(host);
    expect(room(host.pin)).toMatchObject({ status: "playing", phase: "countdown", current_play: 0 });
  });

  it("rebalances by moving the latest joiners of the bigger team", async () => {
    const host = await newRoom("P0");
    const crew: Who[] = [host];
    for (let i = 1; i < 8; i++) crew.push(await join(host.pin, `P${i}`));
    // Players leave one team until it is 2 players against 6.
    const inTeam = (t: number) => crew.filter((c) => players(host.pin).find((p) => p.id === c.playerId)?.team === t);
    const big = inTeam(1).length >= inTeam(2).length ? 1 : 2;
    const small = big === 1 ? 2 : 1;
    const hostTeam = players(host.pin).find((p) => p.id === host.playerId)!.team;
    for (const who of inTeam(small).filter((c) => c.playerId !== host.playerId).slice(2 - (hostTeam === small ? 1 : 0))) await leaveRoom(who);
    const before = teamSizes(host.pin);
    expect(Math.abs(before[0] - before[1])).toBeGreaterThan(1);

    const bigJoinOrder = players(host.pin).filter((p) => p.team === big).map((p) => p.id);
    const res = await startGame(host);
    expect(res).toMatchObject({ ok: true });
    const after = teamSizes(host.pin);
    expect(Math.abs(after[0] - after[1])).toBeLessThanOrEqual(1);
    const moved = bigJoinOrder.filter((id) => players(host.pin).find((p) => p.id === id)!.team === small);
    expect(moved).toEqual(bigJoinOrder.slice(bigJoinOrder.length - moved.length)); // the most recent ones
    expect(res.ok && res.moved).toBe(moved.length);
  });

  it("cannot start twice", async () => {
    const host = await newRoom();
    await join(host.pin, "Ana");
    expect(await startGame(host)).toMatchObject({ ok: true });
    expect(await startGame(host)).toMatchObject({ ok: false, error: "game_started" });
  });
});

describe("leaveRoom and host handover", () => {
  it("passes the crown to the oldest remaining player when the host leaves", async () => {
    const host = await newRoom("Host");
    const second = await join(host.pin, "Second");
    await join(host.pin, "Third");
    expect(await leaveRoom(host)).toMatchObject({ ok: true, roomClosed: false });
    expect(room(host.pin).host_id).toBe(second.playerId);
    expect(players(host.pin)).toHaveLength(2);
    expect(state.db.tables.player_tokens.some((t) => t.player_id === host.playerId)).toBe(false);
  });

  it("keeps the host when someone else leaves", async () => {
    const host = await newRoom();
    const guest = await join(host.pin, "Ana");
    await leaveRoom(guest);
    expect(room(host.pin).host_id).toBe(host.playerId);
  });

  it("frees the nickname after leaving", async () => {
    const host = await newRoom();
    const guest = await join(host.pin, "Ana");
    await leaveRoom(guest);
    expect(await joinRoom({ pin: host.pin, nickname: "Ana", avatar: 3 })).toMatchObject({ ok: true });
  });

  it("closes the room when the last player leaves", async () => {
    const host = await newRoom();
    expect(await leaveRoom(host)).toMatchObject({ ok: true, roomClosed: true });
    expect(state.db.tables.rooms).toHaveLength(0);
    expect(state.db.tables.player_tokens).toHaveLength(0);
  });

  it("refuses a wrong token", async () => {
    const host = await newRoom();
    await join(host.pin, "Ana");
    expect(await leaveRoom({ ...host, token: "z".repeat(32) })).toMatchObject({ error: "not_in_room" });
    expect(players(host.pin)).toHaveLength(2);
  });

  it("the new host can start the game", async () => {
    const host = await newRoom();
    const second = await join(host.pin, "Second");
    await join(host.pin, "Third");
    await join(host.pin, "Fourth"); // 2 v 2, so both teams survive the host leaving
    await leaveRoom(host);
    expect(await startGame(second)).toMatchObject({ ok: true });
  });
});

describe("heartbeat", () => {
  it("updates last_seen", async () => {
    const host = await newRoom();
    const before = players(host.pin)[0].last_seen;
    expect(await heartbeat(host)).toMatchObject({ ok: true });
    expect(players(host.pin)[0].last_seen).not.toBe(before);
  });

  it("refuses a wrong token, a wrong room and a removed player", async () => {
    const host = await newRoom();
    const other = await newRoom("Other");
    const guest = await join(host.pin, "Ana");
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
