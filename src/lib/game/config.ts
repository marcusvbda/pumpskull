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
  maxPlayers: 20,
  maxPerTeam: 10,
  timeOptionsMinutes: [2, 3, 4, 5],
  defaultTimeMinutes: 4,
  roundOptions: [2, 4],
  defaultRounds: 2,
  countdownSeconds: 3,
  roleBannerSeconds: 2,
  cultureSeconds: 15,
  cultureFastSeconds: 5,
  correctPoints: 1,
  fastBonus: 0.5,
  builderAutosaveSeconds: 5,
  nicknameMin: 2,
  nicknameMax: 12,
  avatarCount: 50,
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
