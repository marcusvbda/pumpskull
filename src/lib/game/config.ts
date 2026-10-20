// Tunable game constants. Source of truth: docs/SPEC.md sections 3, 4, 5 and 8.

export type Difficulty = "easy" | "medium" | "hard";

export interface DifficultyConfig {
  label: string;
  items: number; // items in the target scene
  decoys: number; // decoys in the builder tray
  showNames: boolean; // item names and "Try saying" chips
  trayColumns: number;
  rFull: number; // distance (scene widths) with full score
  rZero: number; // distance (scene widths) where score reaches zero
  mascot: "smiling" | "sour" | "fire";
}

export const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  easy: { label: "Chocolate", items: 6, decoys: 1, showNames: true, trayColumns: 3, rFull: 0.08, rZero: 0.35, mascot: "smiling" },
  medium: { label: "Sour Gummy", items: 8, decoys: 2, showNames: false, trayColumns: 4, rFull: 0.06, rZero: 0.28, mascot: "sour" },
  hard: { label: "Chili Tamarind", items: 12, decoys: 4, showNames: false, trayColumns: 4, rFull: 0.04, rZero: 0.2, mascot: "fire" },
};

export const GAME = {
  phonesPerRoom: 2, // one per team (spec section 3, Lobby)
  timeOptionsMinutes: [2, 3, 4, 5],
  defaultTimeMinutes: 4,
  roundOptions: [2, 4],
  defaultRounds: 2,
  countdownSeconds: 3,
  roleBannerSeconds: 2,
  cultureSeconds: 20,
  cultureFastSeconds: 8,
  correctPoints: 1,
  fastBonus: 0.5,
  builderAutosaveSeconds: 5,
  heartbeatSeconds: 30, // players.last_seen refresh (one row per phone); every write is also a realtime event for the whole room
  pinAttempts: 20, // tries to find an unused PIN before giving up
  roomMaxAgeHours: 24,
} as const;

// Urgency phases by fraction of time left (spec section 8). First match wins, top to bottom.
export const URGENCY = [
  { minLeft: 0.5, phase: 0, musicRate: 1.0 },
  { minLeft: 0.25, phase: 1, musicRate: 1.05 },
  { minLeft: 0.1, phase: 2, musicRate: 1.15 },
  { minLeft: 0, phase: 3, musicRate: 1.25 },
] as const;
export const URGENCY_LAST_SECONDS = { seconds: 5, musicRate: 1.3 } as const;
export const MAX_EFFECT_HZ = 2; // never flash faster than this

// Every scene file is 2048x1280 (docs/ASSETS.md). Height divided by width, used by the distance formula.
export const SCENE_ASPECT = 1280 / 2048;

// Layout generator (spec section 6). Distances use the same metric as scoring (scene widths).
export const LAYOUT = {
  minSlotDistance: 0.08, // two targets never closer than this
  maxAttempts: 20, // re-rolls with seed progression before giving up
  defaultMaxCopies: 1, // copies of one item type in a scene, unless the item says otherwise
} as const;

// Reveal colours (spec section 4).
export const REVEAL = { green: 0.8, yellow: 0.4 } as const;

// subscribeRoom (spec section 2).
export const SYNC = {
  realtimeTimeoutMs: 6000, // no SUBSCRIBED within this time: start polling
  pollMinMs: 1500,
  pollMaxMs: 2000, // random interval in [min, max] so phones do not poll in lockstep
  debounceMs: 200, // coalesce bursts of realtime events into one fetch
  resyncMs: 15000, // safety refetch while realtime is healthy, in case an event was missed
  realtimeRetryMs: 15000, // while polling, try to open realtime again after this delay
} as const;
