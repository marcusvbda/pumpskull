import { describe, expect, it } from "vitest";
import { MISSING_ANSWER_MS, answerTimeMs, culturePoints, decideWinner, drawQuestion, parseQuestionBank, type Question } from "./culture";
import { createRng } from "./rng";

const q = (id: number, over: Partial<Question> = {}): Question => ({
  id,
  topic: "dod",
  level: "easy",
  question: `Question ${id}?`,
  options: ["a", "b", "c", "d"],
  correct: 1,
  fact: "A fact.",
  ...over,
});

describe("culturePoints", () => {
  it("gives +1 for a correct answer", () => {
    expect(culturePoints(true, 12_000)).toBe(1);
  });

  it("adds +0.5 within the first 8 seconds, including exactly 8", () => {
    expect(culturePoints(true, 1_000)).toBe(1.5);
    expect(culturePoints(true, 8_000)).toBe(1.5);
    expect(culturePoints(true, 8_001)).toBe(1);
  });

  it("gives nothing for a wrong answer, even a fast one", () => {
    expect(culturePoints(false, 500)).toBe(0);
  });
});

describe("answerTimeMs", () => {
  const start = Date.parse("2026-11-02T10:00:00.000Z");
  it("is the time since the question appeared", () => {
    expect(answerTimeMs(new Date(start).toISOString(), start + 4_321)).toBe(4_321);
  });
  it("never goes below 0 or above the 20 s of the question", () => {
    expect(answerTimeMs(start, start - 300)).toBe(0);
    expect(answerTimeMs(start, start + 22_500)).toBe(20_000);
  });
});

describe("decideWinner", () => {
  it("the team score is the sum, so more points win", () => {
    expect(decideWinner({ points: 3.5, totalMs: 90_000 }, { points: 3, totalMs: 10_000 })).toBe(1);
    expect(decideWinner({ points: 2, totalMs: 10_000 }, { points: 2.5, totalMs: 90_000 })).toBe(2);
  });
  it("breaks a tie with the lower total response time", () => {
    expect(decideWinner({ points: 3, totalMs: 40_000 }, { points: 3, totalMs: 35_000 })).toBe(2);
    expect(decideWinner({ points: 3, totalMs: 30_000 }, { points: 3, totalMs: 35_000 })).toBe(1);
  });
  it("is a draw when points and time are equal", () => {
    expect(decideWinner({ points: 3, totalMs: 30_000 }, { points: 3, totalMs: 30_000 })).toBeNull();
  });
  it("counts a missing answer as the whole question time", () => {
    expect(MISSING_ANSWER_MS).toBe(20_000);
  });
});

describe("drawQuestion", () => {
  const bank = Array.from({ length: 12 }, (_, i) => q(i + 1));

  it("never repeats a question inside one room", () => {
    const rng = createRng("room-1");
    const used: number[] = [];
    for (let i = 0; i < bank.length; i++) used.push(drawQuestion(bank, used, rng).id);
    expect(new Set(used).size).toBe(bank.length);
  });

  it("skips used questions", () => {
    const rng = createRng("x");
    for (let i = 0; i < 50; i++) expect(drawQuestion(bank, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], rng).id).toBe(12);
  });

  it("starts the bank over when every question was used", () => {
    const all = bank.map((b) => b.id);
    expect(all).toContain(drawQuestion(bank, all, createRng("y")).id);
  });

  it("is deterministic for a seed", () => {
    expect(drawQuestion(bank, [], createRng("same")).id).toBe(drawQuestion(bank, [], createRng("same")).id);
  });

  it("only draws questions of the requested level", () => {
    const mixed = [...Array.from({ length: 5 }, (_, i) => q(i + 1, { level: "easy" })), ...Array.from({ length: 5 }, (_, i) => q(i + 6, { level: "hard" }))];
    const rng = createRng("lvl");
    for (let i = 0; i < 40; i++) expect(drawQuestion(mixed, [], rng, "hard").level).toBe("hard");
    for (let i = 0; i < 40; i++) expect(drawQuestion(mixed, [], rng, "easy").level).toBe("easy");
  });

  it("never repeats inside one room at a given level, then starts that level over", () => {
    const mixed = [...Array.from({ length: 4 }, (_, i) => q(i + 1, { level: "easy" })), ...Array.from({ length: 4 }, (_, i) => q(i + 5, { level: "medium" }))];
    const rng = createRng("rep");
    const used: number[] = [];
    for (let i = 0; i < 4; i++) used.push(drawQuestion(mixed, used, rng, "medium").id);
    expect(new Set(used).size).toBe(4);
    expect(used.every((id) => id >= 5)).toBe(true);
    expect(drawQuestion(mixed, used, rng, "medium").level).toBe("medium"); // every medium used: starts over, still medium
  });

  it("falls back to the whole bank when the bank has no question of the level", () => {
    const onlyEasy = [q(1), q(2)];
    expect(onlyEasy.map((b) => b.id)).toContain(drawQuestion(onlyEasy, [], createRng("f"), "hard").id);
  });

  it("refuses an empty bank", () => {
    expect(() => drawQuestion([], [], createRng("z"))).toThrow();
  });
});

describe("parseQuestionBank", () => {
  it("accepts a good bank", () => {
    expect(parseQuestionBank([q(1), q(2)])).toHaveLength(2);
  });
  it.each([
    ["repeated id", [q(1), q(1)]],
    ["3 options", [q(1, { options: ["a", "b", "c"] })]],
    ["same options", [q(1, { options: ["a", "a", "c", "d"] })]],
    ["correct out of range", [q(1, { correct: 4 })]],
    ["bad topic", [q(1, { topic: "xmas" as never })]],
    ["empty", []],
  ])("rejects %s", (_name, bank) => {
    expect(() => parseQuestionBank(bank)).toThrow();
  });
});

describe("the real question bank (data/questions.json)", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bank = parseQuestionBank(require("../../../data/questions.json"));

  it("is valid and holds 300 questions, 100 of each level", () => {
    expect(bank).toHaveLength(300);
    for (const level of ["easy", "medium", "hard"] as const) expect(bank.filter((b) => b.level === level)).toHaveLength(100);
  });

  it("has 100 of each topic and spreads the correct answer over all 4 positions", () => {
    for (const topic of ["dod", "halloween", "compare"] as const) expect(bank.filter((b) => b.topic === topic)).toHaveLength(100);
    for (let i = 0; i < 4; i++) expect(bank.filter((b) => b.correct === i).length).toBeGreaterThan(60);
  });

  it("has no repeated question text", () => {
    expect(new Set(bank.map((b) => b.question)).size).toBe(bank.length);
  });
});
