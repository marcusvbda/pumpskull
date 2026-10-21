import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type FakeDb } from "@/test/fakeSupabase";

const state = vi.hoisted(() => ({ db: undefined as unknown as FakeDb }));
vi.mock("@/lib/supabase/server", () => ({ supabaseAdmin: () => state.db }));

import questions from "../../../data/questions.json";
import { GAME } from "@/lib/game/config";
import { decideWinner } from "@/lib/game/culture";
import { startCulture, submitAnswer } from "./culture";
import { advanceTimer, nextPlay, savePlacement } from "./play";
import { createRoom, joinRoom, playAgain, startGame, updateSettings } from "./room";

type Who = { pin: string; playerId: string; token: string };

const T0 = Date.parse("2026-11-02T10:00:00.000Z");
let now = T0;
const at = (ms: number) => {
  now = T0 + ms;
  vi.setSystemTime(now);
};
const later = (ms: number) => at(now - T0 + ms);

beforeEach(() => {
  state.db = createFakeDb();
  vi.useFakeTimers({ toFake: ["Date"] });
  at(0);
});
afterEach(() => vi.useRealTimers());

const room = (pin: string) => state.db.tables.rooms.find((r) => r.pin === pin)!;
const rows = (table: string, pin: string) => state.db.tables[table].filter((r) => r.room_pin === pin);
const correctOf = (id: number) => questions.find((q) => q.id === id)!.correct;

async function startedGame(settings: object = { time_minutes: 2 }) {
  const created = await createRoom();
  if (!created.ok) throw new Error(created.error);
  const marigold: Who = { pin: created.pin, playerId: created.playerId, token: created.token };
  const joined = await joinRoom({ pin: marigold.pin });
  if (!joined.ok) throw new Error(joined.error);
  const pumpkin: Who = { pin: joined.pin, playerId: joined.playerId, token: joined.token };
  await updateSettings({ ...marigold, settings });
  expect(await startGame(marigold)).toMatchObject({ ok: true });
  return { marigold, pumpkin, pin: marigold.pin };
}

// Plays play `play` up to the reveal.
async function toReveal(marigold: Who, pumpkin: Who, play: number) {
  later(Date.parse(room(marigold.pin).phase_started_at as string) - now + 5000);
  await advanceTimer({ ...marigold, phase: "countdown", play });
  const builder = play % 2 === 0 ? pumpkin : marigold;
  expect(await savePlacement({ ...builder, play, items: [], finish: true })).toMatchObject({ ok: true, ended: true });
}

async function toCulture(marigold: Who, pumpkin: Who, play = 0) {
  await toReveal(marigold, pumpkin, play);
  expect(await startCulture({ ...marigold, play })).toMatchObject({ ok: true });
}

const questionOf = (pin: string, play: number) => rows("question_public", pin).find((q) => q.play_idx === play)!;

describe("startCulture", () => {
  it("is host only, and only from the reveal", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    expect(await startCulture({ ...marigold, play: 0 })).toMatchObject({ error: "play_over" });
    await toReveal(marigold, pumpkin, 0);
    expect(await startCulture({ ...pumpkin, play: 0 })).toMatchObject({ error: "not_host" });
    expect(room(pin).phase).toBe("reveal");
    expect(await startCulture({ ...marigold, play: 0 })).toMatchObject({ ok: true });
    expect(room(pin).phase).toBe("culture");
    expect(await startCulture({ ...marigold, play: 0 })).toMatchObject({ error: "play_over" }); // double tap
    expect(rows("question_public", pin)).toHaveLength(1);
    expect(rows("questions_used", pin)).toHaveLength(1);
  });

  it("publishes the question without its answer", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toCulture(marigold, pumpkin);
    const pub = questionOf(pin, 0);
    expect(pub.options).toHaveLength(4);
    const text = JSON.stringify([pub, room(pin), rows("players", pin)]);
    expect(text).not.toContain('"correct"');
    expect(text).not.toContain('"fact"');
    expect(rows("question_reveal", pin)).toHaveLength(0);
  });
});

describe("question level follows the game difficulty", () => {
  it.each([
    ["easy", "easy"],
    ["medium", "medium"],
    ["hard", "hard"],
  ] as const)("%s game asks only %s questions", async (difficulty, level) => {
    const { marigold, pumpkin, pin } = await startedGame({ time_minutes: 2, difficulty });
    await toCulture(marigold, pumpkin);
    const asked = questions.find((q) => q.id === questionOf(pin, 0).question_id)!;
    expect(asked.level).toBe(level);
  });

  it("keeps the level for the whole game and never repeats a question", async () => {
    const { marigold, pumpkin, pin } = await startedGame({ time_minutes: 2, difficulty: "hard", rounds: 4 });
    for (let play = 0; play < 8; play++) {
      await toCulture(marigold, pumpkin, play);
      await submitAnswer({ ...marigold, play, option: 0 });
      await submitAnswer({ ...pumpkin, play, option: 0 });
      later(GAME.cultureFeedbackSeconds * 1000);
      await advanceTimer({ ...marigold, phase: "culture_feedback", play });
      await nextPlay({ ...marigold, play });
    }
    const ids = rows("question_public", pin).map((q) => q.question_id as number);
    expect(new Set(ids).size).toBe(8);
    expect(ids.every((id) => questions.find((q) => q.id === id)!.level === "hard")).toBe(true);
  });
});

describe("submitAnswer", () => {
  it("gives +1 for a correct answer and +0.5 within 8 seconds, by the server's clock", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toCulture(marigold, pumpkin);
    const right = correctOf(questionOf(pin, 0).question_id as number);
    const wrong = (right + 1) % 4;
    const startedAt = Date.parse(room(pin).phase_started_at as string);
    at(startedAt - T0 + 3000);
    expect(await submitAnswer({ ...marigold, play: 0, option: right })).toMatchObject({ ok: true, already: false });
    at(startedAt - T0 + 12_000);
    expect(await submitAnswer({ ...pumpkin, play: 0, option: right })).toMatchObject({ ok: true });
    const [a, b] = rows("question_reveal", pin)[0].answers as { team: number; points: number; ms: number }[];
    expect(a).toMatchObject({ team: 1, points: 1.5, ms: 3000 });
    expect(b).toMatchObject({ team: 2, points: 1, ms: 12_000 });
    expect(wrong).not.toBe(right);
  });

  it("gives 0 for a wrong answer, however fast", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toCulture(marigold, pumpkin);
    const right = correctOf(questionOf(pin, 0).question_id as number);
    await submitAnswer({ ...marigold, play: 0, option: (right + 1) % 4 });
    await submitAnswer({ ...pumpkin, play: 0, option: (right + 2) % 4 });
    expect(rows("answers", pin).map((a) => a.points)).toEqual([0, 0]);
  });

  it("keeps the first answer and ignores a second tap", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toCulture(marigold, pumpkin);
    expect(await submitAnswer({ ...marigold, play: 0, option: 2 })).toMatchObject({ ok: true, already: false });
    expect(await submitAnswer({ ...marigold, play: 0, option: 3 })).toMatchObject({ ok: true, already: true });
    expect(rows("answers", pin)).toHaveLength(1);
    expect(rows("answers", pin)[0].option).toBe(2);
    expect(room(pin).phase).toBe("culture"); // the other team has not answered yet
  });

  it("shows the feedback right away once both teams answered", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toCulture(marigold, pumpkin);
    await submitAnswer({ ...marigold, play: 0, option: 0 });
    expect(rows("question_reveal", pin)).toHaveLength(0);
    await submitAnswer({ ...pumpkin, play: 0, option: 1 });
    expect(room(pin).phase).toBe("culture_feedback");
    expect(rows("question_reveal", pin)).toHaveLength(1);
    expect(rows("team_scores", pin)).toHaveLength(2);
  });

  it("refuses bad input, a wrong play, a wrong phase and a late answer", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    expect(await submitAnswer({ ...marigold, play: 0, option: 0 })).toMatchObject({ error: "play_over" });
    await toCulture(marigold, pumpkin);
    expect(await submitAnswer({ ...marigold, play: 0, option: 4 })).toMatchObject({ error: "invalid_request" });
    expect(await submitAnswer({ ...marigold, play: 0, option: 1.5 })).toMatchObject({ error: "invalid_request" });
    expect(await submitAnswer({ ...marigold, play: 1, option: 0 })).toMatchObject({ error: "play_over" });
    expect(await submitAnswer({ ...marigold, token: "x".repeat(32), play: 0, option: 0 })).toMatchObject({ error: "not_in_room" });
    const startedAt = Date.parse(room(pin).phase_started_at as string);
    at(startedAt - T0 + (GAME.cultureSeconds + 4) * 1000);
    expect(await submitAnswer({ ...marigold, play: 0, option: 0 })).toMatchObject({ error: "play_over" });
    expect(rows("answers", pin)).toHaveLength(0);
  });
});

describe("time-out and feedback", () => {
  it("closes the question after 20 seconds, counting a missing answer as 0 points and the whole time", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toCulture(marigold, pumpkin);
    const right = correctOf(questionOf(pin, 0).question_id as number);
    await submitAnswer({ ...marigold, play: 0, option: right });
    const startedAt = Date.parse(room(pin).phase_started_at as string);

    at(startedAt - T0 + 10_000);
    expect(await advanceTimer({ ...pumpkin, phase: "culture", play: 0 })).toMatchObject({ ok: true, changed: false });

    at(startedAt - T0 + (GAME.cultureSeconds + 3) * 1000);
    expect(await advanceTimer({ ...pumpkin, phase: "culture", play: 0 })).toMatchObject({ ok: true, changed: true });
    expect(await advanceTimer({ ...marigold, phase: "culture", play: 0 })).toMatchObject({ ok: true, changed: false });
    const reveal = rows("question_reveal", pin)[0];
    expect(reveal.correct).toBe(right);
    expect(reveal.answers).toEqual([
      { team: 1, option: right, ms: 0, points: 1.5 },
      { team: 2, option: null, ms: 20_000, points: 0 },
    ]);
  });

  it("does not leak the correct answer before the feedback", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toCulture(marigold, pumpkin);
    await submitAnswer({ ...marigold, play: 0, option: 0 });
    expect(rows("question_reveal", pin)).toHaveLength(0);
    expect(JSON.stringify(rows("team_scores", pin))).toBe("[]");
  });

  it("moves to the scoreboard after the feedback time, and finishes a feedback left without rows", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    await toCulture(marigold, pumpkin);
    await submitAnswer({ ...marigold, play: 0, option: 0 });
    await submitAnswer({ ...pumpkin, play: 0, option: 0 });
    // simulate a crash between the phase change and the rows
    state.db.tables.question_reveal.length = 0;
    state.db.tables.team_scores.length = 0;
    later(3000);
    expect(await advanceTimer({ ...marigold, phase: "culture_feedback", play: 0 })).toMatchObject({ changed: false });
    expect(rows("question_reveal", pin)).toHaveLength(1);
    expect(rows("team_scores", pin)).toHaveLength(2);
    later(GAME.cultureFeedbackSeconds * 1000);
    expect(await advanceTimer({ ...marigold, phase: "culture_feedback", play: 0 })).toMatchObject({ changed: true });
    expect(room(pin).phase).toBe("scoreboard");
    expect(rows("question_reveal", pin)).toHaveLength(1); // not written twice
  });
});

describe("a whole game", () => {
  async function playRound(marigold: Who, pumpkin: Who, pin: string, play: number, picks: [number, number]) {
    await toCulture(marigold, pumpkin, play);
    const right = correctOf(questionOf(pin, play).question_id as number);
    // picks: 1 = answers correctly, 0 = wrong
    await submitAnswer({ ...marigold, play, option: picks[0] ? right : (right + 1) % 4 });
    await submitAnswer({ ...pumpkin, play, option: picks[1] ? right : (right + 1) % 4 });
    later(GAME.cultureFeedbackSeconds * 1000);
    await advanceTimer({ ...marigold, phase: "culture_feedback", play });
    expect(room(pin).phase).toBe("scoreboard");
    return nextPlay({ ...marigold, play });
  }

  it("adds up team points over the plays, never repeats a question and picks the winner", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    const picks: [number, number][] = [[1, 0], [1, 1], [0, 1], [1, 0]];
    for (let play = 0; play < 4; play++) {
      expect(await playRound(marigold, pumpkin, pin, play, picks[play])).toMatchObject({ ok: true, finished: play === 3 });
    }
    expect(room(pin)).toMatchObject({ phase: "finished", status: "finished" });

    const ids = rows("question_public", pin).map((q) => q.question_id);
    expect(new Set(ids).size).toBe(4);

    const last = (team: number) => rows("team_scores", pin).find((s) => s.play_idx === 3 && s.team === team)!;
    // Each correct answer is worth 1.5 here (answered the instant the question appeared).
    expect(last(1).points).toBe(4.5);
    expect(last(2).points).toBe(3);
    expect(rows("team_scores", pin)).toHaveLength(8);
    expect(decideWinner({ points: Number(last(1).points), totalMs: Number(last(1).total_ms) }, { points: Number(last(2).points), totalMs: Number(last(2).total_ms) })).toBe(1);
  });

  it("brings the same phones back to a clean lobby with Play again, host only", async () => {
    const { marigold, pumpkin, pin } = await startedGame();
    for (let play = 0; play < 4; play++) await playRound(marigold, pumpkin, pin, play, [1, 1]);
    const usedBefore = rows("questions_used", pin).map((q) => q.question_id);
    expect(usedBefore).toHaveLength(4);

    expect(await playAgain({ ...pumpkin })).toMatchObject({ error: "not_host" });
    expect(await playAgain({ ...marigold })).toMatchObject({ ok: true });
    expect(await playAgain({ ...marigold })).toMatchObject({ ok: false });
    expect(room(pin)).toMatchObject({ status: "lobby", phase: "lobby", current_play: 0, spirit_meter: 0 });
    for (const table of ["plays", "play_targets", "placements", "play_results", "question_public", "question_reveal", "team_scores", "answers"]) {
      expect(rows(table, pin)).toHaveLength(0);
    }
    expect(rows("players", pin)).toHaveLength(2);

    // a second game: new questions
    expect(await startGame(marigold)).toMatchObject({ ok: true });
    await toCulture(marigold, pumpkin, 0);
    expect(usedBefore).not.toContain(questionOf(pin, 0).question_id);
  });

  it("refuses Play again before the game is over", async () => {
    const { marigold } = await startedGame();
    expect(await playAgain({ ...marigold })).toMatchObject({ error: "not_allowed" });
  });
});
