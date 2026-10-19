// subscribeRoom(pin, callback): the only way the browser follows a room (spec section 2).
// Read-only, anon key. Delivers the full public snapshot of the room, or null if the room does not exist.

import { supabaseBrowser } from "./browser";
import { createRoomSync, type SyncMode } from "./roomSync";
import { PUBLIC_ROOM_TABLES, type RoomSnapshot } from "./types";

export type { SyncMode } from "./roomSync";

export interface SubscribeRoomOptions {
  onMode?: (mode: SyncMode) => void; // show "connection lost, retrying" or debug info
  onError?: (error: unknown) => void;
  forcePolling?: boolean; // for testing the fallback without blocking WebSockets
}

export async function fetchRoomSnapshot(pin: string): Promise<RoomSnapshot | null> {
  const { data, error } = await supabaseBrowser().rpc("room_snapshot", { p_pin: pin });
  if (error) throw error;
  return (data as RoomSnapshot | null) ?? null;
}

export function subscribeRoom(
  pin: string,
  callback: (snapshot: RoomSnapshot | null) => void,
  options: SubscribeRoomOptions = {},
): () => void {
  const supabase = supabaseBrowser();

  const sync = createRoomSync<RoomSnapshot | null>({
    fetchSnapshot: () => fetchRoomSnapshot(pin),
    onSnapshot: callback,
    onMode: options.onMode,
    onError: options.onError,
    openRealtime: ({ onChange, onStatus }) => {
      if (options.forcePolling) {
        onStatus(false);
        return () => {};
      }
      const channel = supabase.channel(`room:${pin}:${Math.random().toString(36).slice(2)}`, {
        config: { postgres_changes_options: { wait: true } },
      });
      for (const { table, pinColumn } of PUBLIC_ROOM_TABLES) {
        channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `${pinColumn}=eq.${pin}` }, onChange);
      }
      // Delete events cannot be filtered by column, so listen to player deletes separately.
      channel.on("postgres_changes", { event: "DELETE", schema: "public", table: "players" }, onChange);
      channel.subscribe((status) => onStatus(status === "SUBSCRIBED"));
      return () => {
        void supabase.removeChannel(channel);
      };
    },
  });

  // Phones pause tabs when the screen locks: refetch as soon as the game is visible again.
  const onVisible = () => {
    if (document.visibilityState === "visible") sync.refresh();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", sync.refresh);

  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", sync.refresh);
    sync.stop();
  };
}
