// Transport-independent sync engine behind subscribeRoom. Kept free of Supabase so it can be tested
// with fake timers.
//
// - Realtime healthy: every change event triggers a (debounced) refetch of the full snapshot, plus a
//   slow safety refetch in case an event was lost.
// - Realtime blocked or broken (school wifi): poll every pollMinMs..pollMaxMs and keep trying to reopen
//   realtime in the background.
// The callback only fires when the snapshot actually changed.

import { SYNC } from "@/lib/game/config";

export type SyncMode = "connecting" | "realtime" | "polling";

export interface RealtimeHandlers {
  onChange: () => void;
  onStatus: (ok: boolean) => void; // true = subscribed, false = error / timeout / closed
}

export interface RoomSyncDeps<S> {
  fetchSnapshot: () => Promise<S>;
  openRealtime: (handlers: RealtimeHandlers) => () => void; // returns close()
  onSnapshot: (snapshot: S) => void;
  onMode?: (mode: SyncMode) => void;
  onError?: (error: unknown) => void;
  timing?: Partial<Record<keyof typeof SYNC, number>>;
  random?: () => number;
}

export interface RoomSync {
  refresh: () => void; // fetch now, e.g. when the phone screen comes back on
  stop: () => void;
}

export function createRoomSync<S>(deps: RoomSyncDeps<S>): RoomSync {
  const t = { ...SYNC, ...deps.timing };
  const random = deps.random ?? Math.random;

  let stopped = false;
  let mode: SyncMode = "connecting";
  let lastJson: string | undefined;
  let inFlight = false;
  let fetchAgain = false;

  let nextFetchTimer: ReturnType<typeof setTimeout> | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let connectTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  let closeRealtime: (() => void) | undefined;
  let generation = 0; // ignores callbacks from a realtime channel that was already closed

  const setMode = (m: SyncMode) => {
    if (m === mode) return;
    mode = m;
    deps.onMode?.(m);
  };

  const pollDelay = () => t.pollMinMs + random() * (t.pollMaxMs - t.pollMinMs);

  const scheduleNext = () => {
    clearTimeout(nextFetchTimer);
    if (stopped) return;
    if (mode === "polling") nextFetchTimer = setTimeout(doFetch, pollDelay());
    else if (mode === "realtime") nextFetchTimer = setTimeout(doFetch, t.resyncMs);
    // connecting: the connect timeout decides what happens next
  };

  async function doFetch() {
    if (stopped) return;
    if (inFlight) {
      fetchAgain = true; // a change arrived mid-request: fetch once more afterwards
      return;
    }
    inFlight = true;
    clearTimeout(nextFetchTimer);
    try {
      const snapshot = await deps.fetchSnapshot();
      if (stopped) return;
      const json = JSON.stringify(snapshot);
      if (json !== lastJson) {
        lastJson = json;
        deps.onSnapshot(snapshot);
      }
    } catch (error) {
      if (!stopped) deps.onError?.(error);
    } finally {
      inFlight = false;
    }
    if (stopped) return;
    if (fetchAgain) {
      fetchAgain = false;
      void doFetch();
    } else {
      scheduleNext();
    }
  }

  const fetchSoon = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doFetch, t.debounceMs);
  };

  function startPolling() {
    if (stopped || mode === "polling") return;
    setMode("polling");
    void doFetch();
    clearTimeout(retryTimer);
    retryTimer = setTimeout(reopenRealtime, t.realtimeRetryMs);
  }

  function openRealtime() {
    const gen = ++generation;
    closeRealtime?.(); // its CLOSED status now carries a stale generation and is ignored
    clearTimeout(connectTimer);
    connectTimer = setTimeout(() => {
      if (gen === generation && mode !== "realtime") startPolling();
    }, t.realtimeTimeoutMs);

    closeRealtime = deps.openRealtime({
      onChange: () => {
        if (gen === generation && !stopped) fetchSoon();
      },
      onStatus: (ok) => {
        if (gen !== generation || stopped) return;
        if (ok) {
          clearTimeout(connectTimer);
          clearTimeout(retryTimer);
          setMode("realtime");
          void doFetch(); // catch up on anything that changed while we were not listening
        } else {
          startPolling();
        }
      },
    });
  }

  function reopenRealtime() {
    if (stopped || mode === "realtime") return;
    openRealtime();
    // still polling meanwhile; schedule the next attempt in case this one fails silently
    clearTimeout(retryTimer);
    retryTimer = setTimeout(reopenRealtime, t.realtimeRetryMs);
  }

  deps.onMode?.(mode);
  void doFetch();
  openRealtime();

  return {
    refresh: () => void doFetch(),
    stop: () => {
      stopped = true;
      generation++;
      clearTimeout(nextFetchTimer);
      clearTimeout(debounceTimer);
      clearTimeout(connectTimer);
      clearTimeout(retryTimer);
      closeRealtime?.();
      closeRealtime = undefined;
    },
  };
}
