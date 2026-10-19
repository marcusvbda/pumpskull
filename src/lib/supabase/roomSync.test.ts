import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoomSync, type RealtimeHandlers, type SyncMode } from "./roomSync";

const timing = {
  realtimeTimeoutMs: 1000,
  pollMinMs: 100,
  pollMaxMs: 200,
  debounceMs: 50,
  resyncMs: 5000,
  realtimeRetryMs: 3000,
};

function setup(fetchImpl?: () => Promise<unknown>) {
  let state = { v: 0 };
  const fetchSnapshot = vi.fn(fetchImpl ?? (async () => ({ ...state })));
  const onSnapshot = vi.fn();
  const modes: SyncMode[] = [];
  const channels: { handlers: RealtimeHandlers; close: ReturnType<typeof vi.fn> }[] = [];
  const sync = createRoomSync({
    fetchSnapshot,
    onSnapshot,
    onMode: (m) => modes.push(m),
    openRealtime: (handlers) => {
      const close = vi.fn();
      channels.push({ handlers, close });
      return close;
    },
    timing,
    random: () => 0, // poll exactly every pollMinMs
  });
  return {
    sync,
    fetchSnapshot,
    onSnapshot,
    modes,
    channels,
    latest: () => channels[channels.length - 1],
    set: (v: number) => (state = { v }),
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createRoomSync", () => {
  it("fetches the snapshot immediately and opens realtime", async () => {
    const s = setup();
    await vi.advanceTimersByTimeAsync(0);
    expect(s.fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(s.onSnapshot).toHaveBeenCalledWith({ v: 0 });
    expect(s.channels).toHaveLength(1);
    expect(s.modes).toEqual(["connecting"]);
    s.sync.stop();
  });

  it("refetches (debounced) on realtime changes once subscribed", async () => {
    const s = setup();
    s.latest().handlers.onStatus(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(s.modes).toEqual(["connecting", "realtime"]);
    const before = s.fetchSnapshot.mock.calls.length;

    s.set(1);
    s.latest().handlers.onChange();
    s.latest().handlers.onChange();
    s.latest().handlers.onChange();
    await vi.advanceTimersByTimeAsync(timing.debounceMs);
    expect(s.fetchSnapshot.mock.calls.length).toBe(before + 1); // burst coalesced
    expect(s.onSnapshot).toHaveBeenLastCalledWith({ v: 1 });
    s.sync.stop();
  });

  it("does not poll while realtime is healthy, only a slow safety resync", async () => {
    const s = setup();
    s.latest().handlers.onStatus(true);
    await vi.advanceTimersByTimeAsync(0);
    const before = s.fetchSnapshot.mock.calls.length;
    await vi.advanceTimersByTimeAsync(timing.resyncMs - 1);
    expect(s.fetchSnapshot.mock.calls.length).toBe(before);
    await vi.advanceTimersByTimeAsync(1);
    expect(s.fetchSnapshot.mock.calls.length).toBe(before + 1);
    s.sync.stop();
  });

  it("falls back to polling when realtime never subscribes", async () => {
    const s = setup();
    await vi.advanceTimersByTimeAsync(timing.realtimeTimeoutMs);
    expect(s.modes).toEqual(["connecting", "polling"]);
    const before = s.fetchSnapshot.mock.calls.length;
    await vi.advanceTimersByTimeAsync(timing.pollMinMs * 5);
    expect(s.fetchSnapshot.mock.calls.length).toBe(before + 5);
    s.sync.stop();
  });

  it("falls back to polling on a channel error and picks up changes", async () => {
    const s = setup();
    s.latest().handlers.onStatus(true);
    await vi.advanceTimersByTimeAsync(0);
    s.latest().handlers.onStatus(false);
    expect(s.modes.at(-1)).toBe("polling");
    s.set(7);
    await vi.advanceTimersByTimeAsync(timing.pollMinMs);
    expect(s.onSnapshot).toHaveBeenLastCalledWith({ v: 7 });
    s.sync.stop();
  });

  it("keeps retrying realtime while polling and stops polling once it is back", async () => {
    const s = setup();
    s.latest().handlers.onStatus(false);
    expect(s.channels).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(timing.realtimeRetryMs);
    expect(s.channels).toHaveLength(2);
    expect(s.channels[0].close).toHaveBeenCalled();

    s.latest().handlers.onStatus(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(s.modes.at(-1)).toBe("realtime");
    const before = s.fetchSnapshot.mock.calls.length;
    await vi.advanceTimersByTimeAsync(timing.pollMinMs * 10);
    expect(s.fetchSnapshot.mock.calls.length).toBe(before); // polling stopped
    s.sync.stop();
  });

  it("ignores events from a channel that was replaced", async () => {
    const s = setup();
    s.latest().handlers.onStatus(false);
    await vi.advanceTimersByTimeAsync(timing.realtimeRetryMs);
    const old = s.channels[0];
    old.handlers.onStatus(true); // stale
    expect(s.modes.at(-1)).toBe("polling");
    s.sync.stop();
  });

  it("only calls back when the snapshot changed", async () => {
    const s = setup();
    await vi.advanceTimersByTimeAsync(timing.realtimeTimeoutMs + timing.pollMinMs * 5);
    expect(s.fetchSnapshot.mock.calls.length).toBeGreaterThan(3);
    expect(s.onSnapshot).toHaveBeenCalledTimes(1);
    s.set(2);
    await vi.advanceTimersByTimeAsync(timing.pollMinMs);
    expect(s.onSnapshot).toHaveBeenCalledTimes(2);
    s.sync.stop();
  });

  it("never runs two fetches at once and refetches after a change during a request", async () => {
    let resolve: (v: unknown) => void = () => {};
    let active = 0;
    let maxActive = 0;
    const s = setup(() => {
      active++;
      maxActive = Math.max(maxActive, active);
      return new Promise((r) => {
        resolve = (v) => {
          active--;
          r(v);
        };
      });
    });
    s.latest().handlers.onStatus(true);
    s.latest().handlers.onChange();
    await vi.advanceTimersByTimeAsync(timing.debounceMs);
    expect(s.fetchSnapshot).toHaveBeenCalledTimes(1); // still waiting for the first one
    resolve({ v: 1 });
    await vi.advanceTimersByTimeAsync(0);
    expect(s.fetchSnapshot).toHaveBeenCalledTimes(2); // queued refetch
    resolve({ v: 2 });
    await vi.advanceTimersByTimeAsync(0);
    expect(maxActive).toBe(1);
    expect(s.onSnapshot).toHaveBeenLastCalledWith({ v: 2 });
    s.sync.stop();
  });

  it("keeps going after a failed fetch", async () => {
    let fail = true;
    const s = setup(async () => {
      if (fail) throw new Error("network");
      return { v: 3 };
    });
    await vi.advanceTimersByTimeAsync(timing.realtimeTimeoutMs);
    fail = false;
    await vi.advanceTimersByTimeAsync(timing.pollMinMs);
    expect(s.onSnapshot).toHaveBeenCalledWith({ v: 3 });
    s.sync.stop();
  });

  it("stops everything on stop()", async () => {
    const s = setup();
    await vi.advanceTimersByTimeAsync(timing.realtimeTimeoutMs);
    s.sync.stop();
    const calls = s.fetchSnapshot.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(s.fetchSnapshot.mock.calls.length).toBe(calls);
    expect(s.latest().close).toHaveBeenCalled();
    s.latest().handlers.onChange();
    await vi.advanceTimersByTimeAsync(1000);
    expect(s.fetchSnapshot.mock.calls.length).toBe(calls);
  });
});
