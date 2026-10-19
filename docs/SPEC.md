# Pumpskull — Game Spec v1

Last update: 2026-10-19. Source of truth for the game. If code and spec disagree, ask before changing either.

## 1. Overview

Pumpskull is a free, mobile-first, Kahoot-style web game for one classroom (max 20 players, 10 per team) that compares Day of the Dead and Halloween while practising English. It is an English-course school project and must be playable by about 2 Nov 2026.

- **Join:** room PIN + nickname + avatar. No login.
- **Core loop:** two teams are paired across teams. One player describes a hidden decorated scene in English, the partner drags items to rebuild it without seeing the target. Afterwards everyone answers a culture question (Culture Check).
- **Winner:** the team with the best Culture Check score. Placement accuracy feeds a shared room meter (Spirit Meter) and does not decide the winner.
- **All game text is English.** Code, comments and this spec are English.
- **Everything free:** Vercel Hobby (non-commercial), Supabase free tier, GitHub.
- **Audience:** school classmates, likely minors. Store only nickname and avatar. No analytics, no tracking.

## 2. Tech stack and architecture

TypeScript everywhere, one Next.js app on Vercel, Supabase for state and realtime. No custom server: Vercel functions are short-lived and cannot hold WebSockets or shared memory.

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js (App Router), React, TypeScript | Normal Vercel deploy, no static export |
| Styling | Tailwind CSS | Mobile-first, portrait only |
| Database + realtime | Supabase (Postgres + Realtime) | Free tier: 200 concurrent realtime connections, 2M messages/month, 500 MB |
| Hosting | Vercel Hobby | Free, non-commercial use only (fine for school) |
| Tests | Vitest | Scoring, layout generator, room rules |
| Audio | Web Audio API | Starts only after first tap; mute toggle |
| Drag and drop | Native Pointer Events | `touch-action: none`, `setPointerCapture`, coordinates normalised 0 to 1 |

**Realtime strategy.** Wrap sync in `subscribeRoom(pin, callback)`. It uses Supabase Realtime and falls back to polling every 1.5 to 2 s if the school network blocks WebSockets. Only low-frequency state is synced: room, players, play start, submissions, results, scores. Item dragging is never synced.

**Security.** There is no login. Browsers only READ public tables with the anon key (Row Level Security: select allowed on public tables, nothing on private tables). EVERY write goes through Next.js server actions that use the Supabase service-role key (server only, never in the browser) and check the player's secret token (kept in `localStorage`). The host is the only one who can change settings or advance phases, checked in those server actions. See `supabase/migrations/0001_init.sql` for which tables are public or private.

**Free-tier risks.** The Supabase project pauses after one week of inactivity: wake it before the class. Test on the school wifi with at least four phones before the presentation.

## 3. Game flow and rules

A game is a lobby followed by an even number of rounds. Each round has two plays, and every play ends with a Culture Check.

**Lobby**

1. The first player creates a room and becomes host. The room has a 4-digit PIN. Max 20 players, 10 per team.
2. Joining asks for PIN, nickname (2 to 12 characters, unique in the room, basic bad-word filter) and an avatar (repeats allowed).
3. Players are auto-assigned to Team Marigold or Team Pumpkin at random, always keeping the teams within 1 player of each other.
4. Start unlocks when each team has at least 1 player. Only the host edits settings and starts. If the host leaves, the oldest player in the room becomes host.
5. On Start, if the teams differ by more than 1, the most recent joiners are moved to balance them.

**Settings (host only):** time per play (2, 3, 4 or 5 min, default 4), difficulty (Chocolate, Sour Gummy, Chili Tamarind) and rounds (2 or 4, default 2). See section 5.

**Rounds and plays**

- Round 1 uses an altar, round 2 a house front, round 3 an altar, round 4 a house front. Every play uses a different background and a different random layout, so nobody rebuilds a scene they described.
- Play x.0: Team 1 describes, Team 2 builds. Play x.1: roles swap.
- Pairs are cross-team (one describer, one builder) and all pairs play at the same time, with the same target per play.
- A role banner shows for 2 seconds in the countdown before each play.

**Players without a pair.** If a team has an extra player, that player waits and rotates in on later plays. They still answer the Culture Check and score for their team.

**Disconnects.** The pair continues without the missing player. If the player returns with the same nickname and PIN they resume the current play, otherwise their play scores 0. A builder who disconnects keeps what they had placed when the last state was submitted.

**English practice.** The app cannot verify what is said aloud, so the phrase chips ("on top of", "next to") are hints only, shown on Easy. Nothing in the game scores speech.

## 4. Scoring

The winner is decided only by Culture Check points. Placement accuracy is shared equally by both teams, because cross-team pairs would otherwise reward a describer for sabotaging the builder.

**Placement score (per item, 0 to 1).** The builder drops items anywhere, with no visible slots and no snapping. For each target item:

```
d = sqrt(dx^2 + (dy * h/w)^2)
```

- `dx`, `dy` are the differences between the placed anchor point and the target anchor point, in normalised scene coordinates (0 to 1). `h/w` is the scene aspect ratio, so distance is the same on any screen.
- Score is 1 if `d <= r_full`, 0 if `d >= r_zero`, and between them it falls with a quadratic curve: `score = (1 - t)^2` with `t = (d - r_full) / (r_zero - r_full)`.
- Items of the same type (for example two candles) are matched to targets with the minimum total distance, so the order of dropping does not matter.
- Decoys score 0 and have no penalty. An item that was not placed scores 0.
- `r_full` and `r_zero` come from the difficulty level (section 5) and are constants in one config file (`src/lib/game/config.ts`).
- Each sprite defines an anchor point (bottom-centre for things that sit on a surface, centre for wall items). Targets store the same anchor.

**Spirit Meter.** The sum of item scores of a play is added to the room's Spirit Meter, shown as one bar for the whole room. It is a celebration meter and has no effect on the winner. The reveal screen colours each item: green at 0.8 or more, yellow from 0.4 to 0.8, red below 0.4.

**Culture Check.** After each play, every player (including waiting players) answers one multiple-choice question with 4 options, 15 seconds.

- +1 for a correct answer, +0.5 extra if answered within 5 seconds. A wrong or missing answer scores 0.
- The team score is the **average points per player** of that team, not the sum, so a 10 against 9 split is fair. Waiting players count.
- Questions come from a bank of 300, drawn at random without repeating in the same room.

**Winner.** The team with the higher total Culture Check average after the last play. Tie-break: lower average response time across all answers. If still tied, show a draw.

## 5. Difficulty levels

Hard removes all text help and adds more items, so the describer must use real English descriptions. Tolerance values are tunable constants and need playtesting.

| | Chocolate (easy) | Sour Gummy (medium) | Chili Tamarind (hard) |
| --- | --- | --- | --- |
| Items in the scene | 6 | 8 | 12 |
| Decoys in the tray | 1 | 2 | 4 |
| Item names and "Try saying" chips | shown | hidden | hidden |
| Builder tray | icons with names | icons only | icons only, 4-column grid |
| `r_full` (full score radius) | 0.08 | 0.06 | 0.04 |
| `r_zero` (zero score radius) | 0.35 | 0.28 | 0.20 |
| Mascot | smiling | sour face | on fire |

Same on every level: count badges (such as "2") on repeated items remain visible, culture questions are mixed difficulty, and the time per play is chosen by the host.

## 6. Scenes, slots and the layout generator

Targets are generated at random from empty backgrounds, so the same background can be played many times with different layouts. The builder never sees slots.

**Backgrounds.** At least 3 empty altar backgrounds and 3 empty house-front backgrounds, front view, no items on them, with clear surfaces (steps, shelves, floor, wall, door, window).

**Slots.** Each background has a JSON file with 12 to 16 slots: `id`, normalised position `x`, `y` (0 to 1), `type` (`step`, `shelf`, `floor`, `wall`, `door`, `window`) and `scale` (the size the item should have in that slot).

**Items.** Each item sprite has: `id`, `anchor` (bottom-centre or centre), allowed slot types, and tradition (`dod`, `halloween`). Items of the other tradition act as decoys.

- Altar items: marigold vase, candle, framed photo, pan de muerto, sugar skull, glass of water, incense burner, fruit bowl. Decoys: pumpkin, cobweb, bat, ghost.
- House-front items: witch, cauldron, jack-o'-lantern, bat lights, cobweb, spider, candy corn, ghost. Decoys: marigold vase, candle, sugar skull.

**Layout generator** (pure function, seeded). Input: background, difficulty, seed. Output: the list of `{itemId, slotId}` targets and the decoy list.

1. Pick the item list for the level (6, 8 or 12), repeating types where the level says so (for example 2 candles).
2. For each item, choose a random slot of an allowed type that is still free.
3. Reject layouts where two slots are closer than a minimum distance, and re-roll up to 20 times with a fixed seed progression.
4. The seed is stored with the play (private table) so the describer and every builder get the same target. Only describers receive the target.
5. Do not reuse a background in consecutive plays when more than one exists.

**Slot editor (dev tool).** A hidden page `/dev/slots` where the developer opens a background, clicks to add slots, picks the type and scale, and exports the JSON. Allow about 10 minutes per background.

## 7. Screens

All screens are portrait, English only, with large touch targets and the visual style of the Gemini mockups (deep indigo night, papel picado banner, marigold petals, chunky buttons with a darker bottom edge). Screens 1 to 4, 6A and 7A have Gemini mockups; the others are built from the same style. Mockups live in `docs/mockups/` when added.

| # | Screen | Who sees it | Content and states |
| --- | --- | --- | --- |
| 1 | Entry | Everyone | Logo + mascot, Create room, PIN input and Join. Errors: unknown PIN, room full (20), game already started |
| 2 | Lobby | Everyone | PIN, QR or link, both team columns with avatars and counters (x/20, x/10 per team), host crown, Start (host, locked until each team has 1 player), Settings tab |
| 3 | Nickname and avatar | New player | Nickname field with rules, avatar grid (about 50 busts), Join |
| 4 | Settings | Host (edit), others (read-only) | Time per play, difficulty with mascot expression, rounds (2 or 4) |
| 5 | Round countdown | Everyone | 3-2-1, then a 2-second role banner (Describer or Builder) with partner avatar and name |
| 6A | Describer, Easy | Describer | Target picture, "Only you can see this" badge, item chips with names, "Try saying" chips, timer |
| 6B | Describer, Medium/Hard | Describer | Larger target picture only, hint line "Describe it in English. Your partner can't see this." |
| 7A | Builder, Easy | Builder | Empty scene, tray with named icons, Finish button, timer |
| 7B | Builder, Medium/Hard | Builder | Same, icons only with count badges (Hard: 4-column grid), Finish |
| 8 | Waiting | Waiting player | "You're waiting this play", timer, and a note that the Culture Check follows |
| 9 | Reveal | Everyone | Target vs the pair's build with green/yellow/red badges per item, score of the pair, Spirit Meter bar, Next (host) |
| 10 | Culture Check question | Everyone | Question, 15 s ring, +0.5 fast badge, 4 colour buttons with shapes |
| 11 | Culture Check feedback | Everyone | Correct or Not quite, points earned, answer time, short fun fact |
| 12 | Scoreboard | Everyone | Team averages after each play, Spirit Meter total |
| 13 | Final | Everyone | Winning team, podium, total Spirit Meter, 5 cards "Day of the Dead vs Halloween", Play again (host) |
| 14 | Errors and edge cases | Everyone | Room closed, connection lost with auto-retry, host left (new host banner) |

Sound toggle appears on every screen. Players' avatars always show as bust portraits in circles or rounded squares.

## 8. Urgency effects, audio and accessibility

As time runs out, the play gets more tense, like Overcooked. Phases are driven by the fraction of time left, and changes between phases are smooth.

| Time left | Timer | Screen | Music speed | Sound |
| --- | --- | --- | --- | --- |
| above 50% | normal | normal | 1.0 | none |
| 50% to 25% | orange, slow pulse | normal | 1.05 | none |
| 25% to 10% | red, light shake | red vignette pulsing at 1 Hz | 1.15 | tick every second |
| last 10% (or 15 s) | bigger, strong shake | vignette at 2 Hz | 1.25 | higher tick |
| last 5 s | shake and pop each second | strongest vignette | 1.3 | beep each second |

The end of a play plays an alarm sound. The Culture Check countdown uses a lighter version of the same effect in its last 5 seconds.

**Safety.** No full-screen flashing. Effects are a soft red vignette on the screen edges, never above 2 Hz and never white flashes. Provide a "Reduce effects" toggle, turned on by default when `prefers-reduced-motion` is set. Vibration (`navigator.vibrate`) is optional and Android only.

**Music.** Two versions of the track at the same tempo, `music-game` and `music-hurry` (about 20% faster), with a crossfade between phases. If only one track exists, use `playbackRate` up to 1.2 instead. The audio unlocks on the first tap, a mute toggle is always visible, and tracks are small loops.

**Time sync.** The server stores `started_at` for each play. On joining, each client estimates its clock offset and shows time derived from `started_at`, never a local countdown, so effects start together across phones.

**Accessibility.** Colour is never the only signal (shapes on Culture Check buttons, icons on reveal badges). Touch targets at least 44 px. Text contrast follows WCAG AA.

## 9. Data model and realtime

Postgres tables in Supabase, defined in `supabase/migrations/0001_init.sql`. All rows are deleted 24 hours after the room is created.

Public tables (browser may read with the anon key, never write): `rooms`, `players`, `plays`, `play_results`, `question_public`, `question_reveal`, `team_scores`. Private tables (service role only): `player_tokens`, `play_targets` (seed and target layout), `placements`, `answers`, `questions_used`.

**Phases of a room:** `lobby`, `countdown`, `playing`, `reveal`, `culture`, `culture_feedback`, `scoreboard`, `finished`. The host (or an automatic timer) moves the room to the next phase, and every client renders the screen for the current phase.

**Rules enforced on the server:**

- Only the host can change settings or advance the phase, and only on a valid transition.
- Placement scores and Culture Check points are computed on the server from the stored target and the submitted data, never trusted from the client.
- A builder's placement is saved on Finish, at time-out, and as an autosave every 5 seconds.
- The correct answer of a Culture Check question is written to `question_reveal` only when the phase moves to feedback.
- Only describers receive the target layout; builders never get the seed or targets before the reveal.
- A nickname is unique per room; room join fails above 20 players or 10 in a team.

**Questions.** Stored as `data/questions.json` at the repository root, read only on the server, never inside `public/` and never bundled for the browser, so players cannot read the answers. 300 items: `id`, `topic` (dod, halloween, compare), `level`, `question`, `options` (4), `correct` (0 to 3), `fact`.

## 10. Build order, tests and acceptance

The game is playable with placeholder shapes before any final image arrives. Final art only replaces files in `public/`.

**Build order**

1. Project setup, Supabase schema, `subscribeRoom` with polling fallback, deploy to Vercel.
2. Scoring function, layout generator, team balancing and pairing, all with Vitest tests.
3. Lobby: create room, join, nickname and avatar, teams, settings, host rules.
4. Play loop: countdown, describer and builder screens, drag and drop, submission, reveal.
5. Culture Check: question draw without repeats, answers, scoring, feedback, scoreboard, final screen.
6. Slot editor page and real backgrounds and sprites.
7. Urgency effects, music and sound effects.
8. Classroom test on the school wifi with at least 4 phones (iOS Safari and Android Chrome), then fixes.

**Tests that must pass**

| Area | Cases |
| --- | --- |
| Placement score | exact placement is 1, beyond `r_zero` is 0, curve is quadratic in between, two identical items matched by minimum total distance, decoys give 0, aspect ratio is respected |
| Layout generator | same seed gives same layout, item types only in allowed slots, no two slots under the minimum distance, count and decoys match the level |
| Team balancing | teams differ by at most 1, Start blocked until each team has 1 player, rebalance on Start moves the latest joiners |
| Pairing | roles swap between x.0 and x.1, waiting players rotate, no pair is two players of the same team |
| Culture Check | +1 correct, +0.5 within 5 s, team score is an average, tie-break uses response time, questions never repeat in a room |
| Room rules | 21st player refused, duplicate nickname refused, only the host can start, host handover |

**Acceptance**

- Two phones in different networks can play a full game of 2 rounds on the deployed site.
- Dragging works on iOS Safari and Android Chrome without the page scrolling.
- Nothing in the browser network traffic reveals the target layout to the builder or the correct answer before feedback.
- A full game with 20 simulated players does not exceed the Supabase free limits.

## 11. Assets

See `docs/ASSETS.md` for the full checklist (folders, file names, formats, sizes). The game runs with placeholders until each file exists. What blocks the build first: the empty backgrounds and the item sprites.

## 12. Timeline, out of scope and open items

**Target dates** (today is 19 Oct 2026)

- 23 Oct: empty backgrounds and item sprites delivered (unblocks slot marking).
- 28 Oct: full game playable with placeholders on the deployed site.
- 30 Oct: final art, avatars and questions integrated.
- 1 Nov: test on the school network with at least 4 phones; fix list.
- 2 Nov: playable in class. Wake the Supabase project the day before.

**Out of scope for version 1**

- Projector or teacher view, replays, accounts, saved history, and more than 20 players.
- Voice or speech recognition. English use is a classroom activity, not scored by the app.
- Native apps, app stores, translations of the interface.

**Open items**

- Placement tolerances (`r_full`, `r_zero`) and the curve need playtesting with real players.
- Item lists per scene are proposals and may change once the sprites exist.
- Final comparison cards ("Day of the Dead vs Halloween") are written during the build and reviewed by Vinicius.
- Music licence must be checked before it goes on the public site.
- Domain: a `*.vercel.app` address is enough. Check that the name is free.
