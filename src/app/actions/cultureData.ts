// Culture Check data on the server (spec sections 4 and 9): drawing the question, closing it and writing
// the feedback. Server only, not a "use server" file. data/questions.json is imported here and nowhere else,
// so it is bundled for the server and never for the browser.

import { randomBytes } from "node:crypto";
import questionsJson from "../../../data/questions.json";
import { MISSING_ANSWER_MS, drawQuestion, parseQuestionBank, type Question } from "@/lib/game/culture";
import { createRng } from "@/lib/game/rng";
import type { Team } from "@/lib/game/types";
import type { CultureAnswer, QuestionPublicRow, RoomRow, TeamScoreRow } from "@/lib/supabase/types";
import { getPlayers, isUniqueViolation, must, type Db } from "./shared";

let bank: Question[] | undefined;

export function questionBank(): Question[] {
  return (bank ??= parseQuestionBank(questionsJson));
}

export function findQuestion(id: number): Question | undefined {
  return questionBank().find((q) => q.id === id);
}

export async function getPublicQuestion(db: Db, pin: string, playIdx: number): Promise<QuestionPublicRow | null> {
  return must(
    await db.from("question_public").select("*").eq("room_pin", pin).eq("play_idx", playIdx).maybeSingle(),
  ) as QuestionPublicRow | null;
}

// reveal -> culture. The question (without its answer) is stored first, then the room moves on, so a phone
// that sees the new phase always finds the question. Safe to call twice: the first question stays.
export async function openQuestion(db: Db, room: RoomRow): Promise<boolean> {
  if (!(await getPublicQuestion(db, room.pin, room.current_play))) {
    const used = (must(await db.from("questions_used").select("question_id").eq("room_pin", room.pin)) as { question_id: number }[]).map(
      (r) => r.question_id,
    );
    const q = drawQuestion(questionBank(), used, createRng(randomBytes(9).toString("base64url")), room.settings.difficulty);
    const inserted = await db
      .from("question_public")
      .insert({ room_pin: room.pin, play_idx: room.current_play, question_id: q.id, question: q.question, options: q.options });
    // Lost a race with another call: its question stays, and so does its "used" row.
    if (!isUniqueViolation(inserted.error)) {
      must(inserted);
      const marked = await db.from("questions_used").insert({ room_pin: room.pin, question_id: q.id });
      if (!isUniqueViolation(marked.error)) must(marked);
    }
  }
  const moved = must(
    await db
      .from("rooms")
      .update({ phase: "culture", phase_started_at: new Date().toISOString() })
      .eq("pin", room.pin)
      .eq("phase", "reveal")
      .eq("current_play", room.current_play)
      .select("pin"),
  ) as unknown[];
  return moved.length > 0;
}

// culture -> culture_feedback. Only the call that wins the conditional update writes the feedback; one
// left without it (a crash in between) is finished by writeCultureResults from advanceTimer.
export async function closeQuestion(db: Db, room: RoomRow): Promise<boolean> {
  const claimed = must(
    await db
      .from("rooms")
      .update({ phase: "culture_feedback", phase_started_at: new Date().toISOString() })
      .eq("pin", room.pin)
      .eq("phase", "culture")
      .eq("current_play", room.current_play)
      .select("pin"),
  ) as unknown[];
  if (claimed.length === 0) return false;
  await writeCultureResults(db, room.pin, room.current_play);
  return true;
}

// Team totals and the correct answer, written only when the phase is feedback (spec section 9).
// The reveal row goes last: it is the sign that everything else is there. Safe to call more than once.
export async function writeCultureResults(db: Db, pin: string, playIdx: number): Promise<void> {
  const done = must(await db.from("question_reveal").select("play_idx").eq("room_pin", pin).eq("play_idx", playIdx).maybeSingle());
  if (done) return;
  const pub = await getPublicQuestion(db, pin, playIdx);
  const question = pub && findQuestion(pub.question_id);
  if (!pub || !question) throw new Error(`no question for ${pin} play ${playIdx}`);

  const players = await getPlayers(db, pin);
  const answers = must(await db.from("answers").select("*").eq("room_pin", pin).eq("play_idx", playIdx)) as {
    player_id: string;
    option: number;
    ms: number;
    points: number;
  }[];
  const entries: CultureAnswer[] = ([1, 2] as Team[]).map((team) => {
    const phone = players.find((p) => p.team === team);
    const a = phone && answers.find((x) => x.player_id === phone.id);
    return a ? { team, option: a.option, ms: a.ms, points: Number(a.points) } : { team, option: null, ms: MISSING_ANSWER_MS, points: 0 };
  });

  for (const e of entries) {
    const prev =
      playIdx > 0
        ? (must(
            await db.from("team_scores").select("*").eq("room_pin", pin).eq("play_idx", playIdx - 1).eq("team", e.team).maybeSingle(),
          ) as TeamScoreRow | null)
        : null;
    const inserted = await db.from("team_scores").insert({
      room_pin: pin,
      play_idx: playIdx,
      team: e.team,
      points: Number(prev?.points ?? 0) + e.points,
      total_ms: Number(prev?.total_ms ?? 0) + e.ms,
    });
    if (!isUniqueViolation(inserted.error)) must(inserted);
  }
  const revealed = await db
    .from("question_reveal")
    .insert({ room_pin: pin, play_idx: playIdx, correct: question.correct, fact: question.fact, answers: entries });
  if (!isUniqueViolation(revealed.error)) must(revealed);
}

// Back to a fresh lobby for "Play again". The questions already used stay marked, so the next game gets new ones.
export async function resetGame(db: Db, pin: string): Promise<void> {
  for (const table of ["plays", "play_targets", "placements", "play_results", "question_public", "question_reveal", "team_scores", "answers"]) {
    must(await db.from(table).delete().eq("room_pin", pin));
  }
}
