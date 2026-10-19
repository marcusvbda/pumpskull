"use client";

// React wrapper around subscribeRoom. snapshot: undefined = loading, null = room does not exist.

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRoomSnapshot, subscribeRoom, type SyncMode } from "@/lib/supabase/subscribeRoom";
import type { RoomSnapshot } from "@/lib/supabase/types";

export function useRoom(pin: string) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null | undefined>(undefined);
  const [mode, setMode] = useState<SyncMode>("connecting");
  const [failed, setFailed] = useState(false);
  const newest = useRef(0);

  // A slow response must not overwrite a newer snapshot (refresh() and realtime can cross).
  const apply = useCallback((next: RoomSnapshot | null) => {
    if (next) {
      const time = Date.parse(next.serverTime);
      if (time < newest.current) return;
      newest.current = time;
    }
    setSnapshot(next);
    setFailed(false);
  }, []);

  useEffect(() => {
    newest.current = 0;
    try {
      return subscribeRoom(pin, apply, { onMode: setMode, onError: () => setFailed(true) });
    } catch {
      // Missing Supabase env vars: show the error screen instead of crashing.
      const timer = setTimeout(() => setFailed(true), 0);
      return () => clearTimeout(timer);
    }
  }, [pin, apply]);

  const refresh = useCallback(async () => {
    try {
      apply(await fetchRoomSnapshot(pin));
    } catch {
      setFailed(true);
    }
  }, [pin, apply]);

  return { snapshot, mode, failed, refresh };
}
