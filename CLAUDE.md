# Pumpskull

Free, mobile-first, Kahoot-style classroom game (Day of the Dead vs Halloween, English practice). Full rules and decisions: `docs/SPEC.md`. Asset list: `docs/ASSETS.md`. Read the spec before changing game behaviour.

## Working agreement

- The owner (Vinicius) speaks Portuguese; reply to him in Portuguese. All game text, code, comments, commits and docs are in English.
- Be direct. If something in the spec is wrong or risky, say so and propose a fix.
- Build in the order of section 10 of the spec, one step at a time, and stop after each step so the owner can test. Do not build ahead.
- Deadline: playable about 2 Nov 2026. Everything must work on free tiers (Vercel Hobby, Supabase free).

## Stack

Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres + Realtime) + Vitest. Package manager: npm.

## Rules that must not be broken

- Never ship the target layout to builders or the correct answer to anyone before the right phase (see spec section 9).
- All writes go through Next.js server actions using the Supabase service-role key. The browser only reads public tables with the anon key.
- The service-role key is only read in server code. Never use a `NEXT_PUBLIC_` prefix on it.
- Placement scoring, layout generation, team balancing and pairing are pure functions in `src/lib/game/` with Vitest tests next to them. Tunable numbers live in `src/lib/game/config.ts`.
- Sync goes through `subscribeRoom(pin, callback)` with a polling fallback. Do not sync drag movement.
- Portrait mobile first. Use Pointer Events with `touch-action: none` for drag. Test on real iOS Safari and Android Chrome.
- No full-screen flashing, effects at most 2 Hz, honour `prefers-reduced-motion`.
- No analytics, no trackers, store only nickname and avatar. Players are likely minors.
- Images come from `public/` using the names in `docs/ASSETS.md`. If a file is missing, render a placeholder, never crash.
- `data/questions.json` is server-only. Never put it in `public/`.

## Commands

- `npm run dev` start locally (open on a phone through your LAN IP).
- `npm test` run Vitest. `npm run lint`, `npm run build` must pass before a step is called done.

## Project layout

- `src/app/` routes and server actions
- `src/lib/game/` pure game logic and config (tested)
- `src/lib/supabase/` clients (browser anon, server service-role) and `subscribeRoom`
- `src/components/` UI
- `src/data/` generated JSON (slots, items)
- `supabase/migrations/` SQL, apply with the Supabase SQL editor or CLI
- `docs/` spec, assets, mockups
