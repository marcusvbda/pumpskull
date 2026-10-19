// Nickname rules (spec section 3, Lobby): 2 to 12 characters, basic bad-word filter.
// Uniqueness per room is checked by the server action and the players_room_nickname_uq index.

import { GAME } from "./config";

export type NicknameProblem = "length" | "chars" | "bad_word";

export type NicknameCheck = { ok: true; nickname: string } | { ok: false; problem: NicknameProblem };

// Long, unambiguous words: blocked anywhere inside the nickname.
const BAD_SUBSTRINGS = [
  "fuck", "shit", "bitch", "cunt", "whore", "slut", "nigg", "fagg", "retard", "nazi", "hitler", "porn",
  "caralho", "buceta", "porra", "merda", "cuzao", "vadia", "arrombado", "escroto",
];

// Short words that hide inside innocent ones ("computador", "enviado", "grass"): blocked only as a whole word.
const BAD_WORDS = [
  "ass", "arse", "cock", "dick", "tit", "tits", "sex", "anal", "rape", "fag", "kkk",
  "puta", "puto", "foda", "fodase", "fdp", "pqp", "viado", "cu",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

function toPlainLetters(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[013457@$!]/g, (c) => LEET[c] ?? c);
}

export function isBadNickname(nickname: string): boolean {
  const plain = toPlainLetters(nickname);
  const squashed = plain.replace(/[^a-z]/g, "");
  const collapsed = squashed.replace(/(.)\1+/g, "$1"); // "fuuuck" -> "fuck", also "shiit"
  if (BAD_SUBSTRINGS.some((w) => squashed.includes(w) || collapsed.includes(w.replace(/(.)\1+/g, "$1")))) return true;
  const words = plain.split(/[^a-z]+/).filter(Boolean);
  const exact = new Set(BAD_WORDS);
  return words.some((w) => exact.has(w) || exact.has(w.replace(/(.)\1+/g, "$1"))) || exact.has(squashed);
}

export function cleanNickname(raw: string): string {
  return raw.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function checkNickname(raw: string): NicknameCheck {
  const nickname = cleanNickname(raw);
  const length = [...nickname].length; // code points, like Postgres char_length
  if (length < GAME.nicknameMin || length > GAME.nicknameMax) return { ok: false, problem: "length" };
  if (!/^[\p{L}\p{N} _.-]+$/u.test(nickname)) return { ok: false, problem: "chars" };
  if (isBadNickname(nickname)) return { ok: false, problem: "bad_word" };
  return { ok: true, nickname };
}
