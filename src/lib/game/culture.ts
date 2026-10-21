// Culture Check rules (spec section 4). Pure: the server actions draw questions and score answers with these.

import { GAME } from "./config";
import { randomInt, type Rng } from "./rng";
import type { Team } from "./types";

export type Topic = "dod" | "halloween" | "compare";
export type QuestionLevel = "easy" | "medium" | "hard";

export interface Question {
  id: number;
  topic: Topic;
  level: QuestionLevel;
  question: string;
  options: string[]; // always 4
  correct: number; // 0..3
  fact: string;
}

const TOPICS: readonly Topic[] = ["dod", "halloween", "compare"];
const LEVELS: readonly QuestionLevel[] = ["easy", "medium", "hard"];

// Checks data/questions.json once when the server loads it, so a typo shows up at the first request.
export function parseQuestionBank(raw: unknown): Question[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("questions.json must be a non-empty list");
  const seen = new Set<number>();
  return raw.map((entry, i) => {
    const q = entry as Partial<Question> | null;
    const where = `questions.json item ${i}`;
    if (!q || typeof q !== "object") throw new Error(`${where}: not an object`);
    if (!Number.isInteger(q.id) || seen.has(q.id as number)) throw new Error(`${where}: id missing or repeated`);
    seen.add(q.id as number);
    if (!TOPICS.includes(q.topic as Topic)) throw new Error(`${where}: bad topic`);
    if (!LEVELS.includes(q.level as QuestionLevel)) throw new Error(`${where}: bad level`);
    if (typeof q.question !== "string" || q.question.length === 0) throw new Error(`${where}: no question`);
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => typeof o !== "string" || o.length === 0)) {
      throw new Error(`${where}: needs 4 options`);
    }
    if (new Set(q.options).size !== 4) throw new Error(`${where}: options must differ`);
    if (!Number.isInteger(q.correct) || (q.correct as number) < 0 || (q.correct as number) > 3) throw new Error(`${where}: bad correct`);
    if (typeof q.fact !== "string" || q.fact.length === 0) throw new Error(`${where}: no fact`);
    return q as Question;
  });
}

// Random question of the room's difficulty that this room has not used yet. The game difficulty picks the
// question level (Chocolate = easy, Sour Gummy = medium, Chili Tamarind = hard). When the room used every
// question of that level (many games in a row), that level starts over; a bank with no question of the level
// falls back to the whole bank instead of failing.
export function drawQuestion(bank: readonly Question[], usedIds: Iterable<number>, rng: Rng, level?: QuestionLevel): Question {
  if (bank.length === 0) throw new Error("empty question bank");
  const used = new Set(usedIds);
  const ofLevel = level ? bank.filter((q) => q.level === level) : [];
  const base = ofLevel.length > 0 ? ofLevel : bank;
  const fresh = base.filter((q) => !used.has(q.id));
  const pool = fresh.length > 0 ? fresh : base;
  return pool[randomInt(rng, pool.length)];
}

// +1 for a correct answer, +0.5 more within the first 8 seconds. Wrong or missing: 0.
export function culturePoints(correct: boolean, ms: number): number {
  if (!correct) return 0;
  return GAME.correctPoints + (ms <= GAME.cultureFastSeconds * 1000 ? GAME.fastBonus : 0);
}

// Time between the question appearing and the answer arriving, by the server's clock.
export function answerTimeMs(phaseStartedAt: string | number, answeredAt: number): number {
  const start = typeof phaseStartedAt === "number" ? phaseStartedAt : Date.parse(phaseStartedAt);
  return Math.min(GAME.cultureSeconds * 1000, Math.max(0, Math.round(answeredAt - start)));
}

// A team that did not answer counts as having used all the time (tie-break).
export const MISSING_ANSWER_MS = GAME.cultureSeconds * 1000;

export interface TeamTally {
  points: number;
  totalMs: number;
}

// Higher points win; a tie goes to the lower total answer time; still tied: null (a draw).
export function decideWinner(marigold: TeamTally, pumpkin: TeamTally): Team | null {
  if (marigold.points !== pumpkin.points) return marigold.points > pumpkin.points ? 1 : 2;
  if (marigold.totalMs !== pumpkin.totalMs) return marigold.totalMs < pumpkin.totalMs ? 1 : 2;
  return null;
}
