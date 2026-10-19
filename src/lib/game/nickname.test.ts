import { describe, expect, it } from "vitest";
import { checkNickname, cleanNickname, isBadNickname } from "./nickname";

describe("checkNickname", () => {
  it("accepts 2 to 12 characters", () => {
    expect(checkNickname("Jo")).toEqual({ ok: true, nickname: "Jo" });
    expect(checkNickname("abcdefghijkl")).toEqual({ ok: true, nickname: "abcdefghijkl" });
  });

  it("refuses 1 and 13 characters", () => {
    expect(checkNickname("J")).toEqual({ ok: false, problem: "length" });
    expect(checkNickname("abcdefghijklm")).toEqual({ ok: false, problem: "length" });
    expect(checkNickname("   ")).toEqual({ ok: false, problem: "length" });
  });

  it("trims and collapses spaces before counting", () => {
    expect(cleanNickname("  Ana   Maria ")).toBe("Ana Maria");
    expect(checkNickname("  Ana  ")).toEqual({ ok: true, nickname: "Ana" });
  });

  it("accepts accents and refuses symbols", () => {
    expect(checkNickname("José_99")).toEqual({ ok: true, nickname: "José_99" });
    expect(checkNickname("a<b>c")).toEqual({ ok: false, problem: "chars" });
    expect(checkNickname("hi😀")).toEqual({ ok: false, problem: "chars" });
  });
});

describe("bad-word filter", () => {
  it("blocks bad words, case, accents, leetspeak and stretched letters", () => {
    for (const bad of ["Fuck", "SHIT", "f.u.c.k", "sh1t", "fuuuck", "Caralho", "mérda", "Big Bitch"]) {
      expect(isBadNickname(bad), bad).toBe(true);
      expect(checkNickname(bad).ok, bad).toBe(false);
    }
  });

  it("blocks short bad words only as whole words", () => {
    expect(isBadNickname("ass")).toBe(true);
    expect(isBadNickname("big ass")).toBe(true);
    expect(isBadNickname("puta")).toBe(true);
    expect(isBadNickname("Grass")).toBe(false);
    expect(isBadNickname("Computador")).toBe(false);
    expect(isBadNickname("Enviado")).toBe(false);
    expect(isBadNickname("Classic")).toBe(false);
  });

  it("lets normal nicknames through", () => {
    for (const ok of ["Marigold", "SkullKing", "Vini", "Catrina_7", "Pumpkin 1", "Sofia"]) {
      expect(isBadNickname(ok), ok).toBe(false);
    }
  });
});
