"use server";

// Culture Check server actions (spec sections 4 and 9). Points are computed here from the stored question
// and the server's own clock; the correct answer reaches the phones only through question_reveal, which is
// written when the phase moves to feedback.

import { answerTimeMs, culturePoints } from "@/lib/game/culture";
import { cultureClosesAt } from "@/lib/game/flow";
import { fail } from "@/lib/game/room";
import { supabaseAdmin } from "@/lib/supabase/server";
import { closeQuestion, findQuestion, getPublicQuestion, openQuestion } from "./cultureData";
import { writeResults } from "./playData";
import { getPlayers, guard, isUniqueViolation, loadContext, must, parseCredentials, type Credentials } from "./shared";

function parsePlayIdx(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 100 ? value : null;
}

// Host only: from the reveal to the Culture Check question.
export async function startCulture(input: Credentials & { play: number }) {
  return guard<object>(async () => {
    const creds = parseCredentials(input);
    if (!creds) return fail("invalid_request");
    const play = parsePlayIdx((input as unknown as Record<string, unknown>).play);
    if (play === null) return fail("invalid_request");

    const db = supabaseAdmin();
    const ctx = await loadContext(db, creds);
    if (!ctx) return fail("not_in_room");
    const { room, me } = ctx;
    if (room.host_id !== me.id) return fail("not_host");
    if (room.phase !== "reveal" || room.current_play !== play) return fail("play_over");

    await writeResults(db, room, play); // the Spirit Meter of this play must be final before moving on
    if (!(await openQuestion(db, room))) return fail("play_over"); // double tap: the first one already moved on
    return { ok: true };
  });
}

// One answer per team phone. Returns nothing about right or wrong: that comes with the feedback.
export async function submitAnswer(input: Credentials & { play: number; option: number }) {
  return guard<{ already: boolean }>(async () => {
    const creds = parseCredentials(input);
    if (!creds) return fail("invalid_request");
    const raw = input as unknown as Record<string, unknown>;
    const play = parsePlayIdx(raw.play);
    const option = raw.option;
    if (play === null || typeof option !== "number" || !Number.isInteger(option) || option < 0 || option > 3) return fail("invalid_request");

    const db = supabaseAdmin();
    const ctx = await loadContext(db, creds);
    if (!ctx) return fail("not_in_room");
    const { room, me } = ctx;
    const now = Date.now();
    if (room.phase !== "culture" || room.current_play !== play) return fail("play_over");
    if (now > cultureClosesAt(room.phase_started_at)) return fail("play_over");

    const pub = await getPublicQuestion(db, room.pin, play);
    const question = pub && findQuestion(pub.question_id);
    if (!pub || !question) return fail("not_ready");

    const ms = answerTimeMs(room.phase_started_at, now);
    const inserted = await db.from("answers").insert({
      room_pin: room.pin,
      play_idx: play,
      player_id: me.id,
      option,
      ms,
      points: culturePoints(option === question.correct, ms),
    });
    const already = isUniqueViolation(inserted.error);
    if (!already) must(inserted);

    // Both teams answered: no need to wait for the rest of the 20 seconds.
    const answered = must(await db.from("answers").select("player_id").eq("room_pin", room.pin).eq("play_idx", play)) as unknown[];
    if (answered.length >= (await getPlayers(db, room.pin)).length) await closeQuestion(db, room);
    return { ok: true, already };
  });
}
