# Pumpskull — Asset checklist

**Status (21 Oct 2026): every file below already exists as a basic generated version** (flat vector images, synthesised audio), so the game is fully playable. To use your own art or sound, just replace the file with the same name and extension. For the 20 scene backgrounds also re-mark the slots in `/dev/slots` (npm run dev), because slots follow the drawn surfaces. Not generated: `public/items/decoys/skull.png` (the code does not read it).

**Generated art and audio (21 Oct 2026):** everything below is drawn or synthesised by scripts in `scripts/`, so it can be tuned and rebuilt. Replace any file with your own and keep the name.

| What | Command | Notes |
| --- | --- | --- |
| 20 scene backgrounds | `node scripts/scenes/generate.mjs` | Built from `src/data/slots/*.json`, so the slots always match. Per-scene colours live in `ALTAR_STYLES` / `HOUSE_STYLES`. Re-mark slots in `/dev/slots` only if you swap in your own art. |
| 20 item sprites | `node scripts/scenes/generate-items.mjs` | Standing items rest on y = 1008, wall items are centred, as in `src/data/items.ts`. |
| UI icons, app icon, favicon | `node scripts/scenes/generate-ui.mjs` | Candies and team badges are used by the lobby, settings and score screens (`UiIcon`); the emoji show if a file is missing. |
| Music and sound effects | `node scripts/audio/generate.mjs` | Needs `ffmpeg`. `music-hurry` is the game track at 1.2x tempo, same key. Loops are seamless. |
| Contact sheet / item preview | `scripts/scenes/sheet.mjs`, `scripts/scenes/preview.mjs` | Review helpers, not part of the game. |

Everything here is supplied by Vinicius. The game runs with placeholders until each file exists, so files can arrive in any order, but the **backgrounds and item sprites block the most work** (slot marking, real layouts).

## General rules

- File names: lowercase, digits and hyphens only, exact names below.
- Images: **PNG with a real transparent background** (not a fake checkerboard), except scene backgrounds (opaque is fine). No gray or white boxes around characters or items.
- Keep an original master at higher resolution outside the repo; the repo gets the sizes below.
- Same art style across all files (flat vector, thin deep-indigo outline, palette: deep indigo, purple, marigold orange, turquoise, hot pink, warm white).
- Day of the Dead items must be accurate and respectful.
- Never put `questions.json` in `public/`: it holds the answers.

## Files

| Where to put it | File name | Spec | Needed by |
| --- | --- | --- | --- |
| `public/brand/` | `logo.png` | PNG transparent, 2048 px wide, "PUMPSKULL" lockup with mascot | 30 Oct |
| `public/brand/` | `mascot-easy.png` | PNG transparent, 1024x1024, smiling | 30 Oct |
| `public/brand/` | `mascot-medium.png` | PNG transparent, 1024x1024, sour face | 30 Oct |
| `public/brand/` | `mascot-hard.png` | PNG transparent, 1024x1024, on fire | 30 Oct |
| `public/brand/` | `favicon.png` | PNG, 512x512, simplified mascot face, readable at 32 px | 30 Oct |
| `public/brand/` | `banner.png` | PNG transparent, about 2130x640, hanging Halloween garland shown once across the top of every screen (never tiled or cropped). Source: Pngtree, check the licence and credit if required | done |
| `public/brand/` | `skyline.png` | PNG transparent, about 806x310, hillside town drawn at the bottom of the animated background at very low opacity (`.ambient-skyline` in `globals.css`) | done |
| `public/scenes/altar/` | `altar-1.png` to `altar-10.png` | **EMPTY** front-view Day of the Dead altar, no items, no people. 2048x1280 (16:10, same ratio for every scene file). Clear steps, shelves and floor. Each altar must have a different structure | **23 Oct** |
| `public/scenes/house/` | `house-1.png` to `house-10.png` | **EMPTY** front of a Halloween house, no decorations, no people. 2048x1280 (16:10). Clear porch/floor, door, window, wall. Each house must look different | **23 Oct** |
| `public/items/altar/` | `marigold-vase.png`, `candle.png`, `photo.png`, `bread.png`, `sugar-skull.png`, `water.png`, `incense.png`, `fruit.png` | PNG transparent, 1024 px on the longest side, one item per file, tightly cropped, flat bottom for items that stand on a surface | **23 Oct** |
| `public/items/house/` | `witch.png`, `cauldron.png`, `jack-o-lantern.png`, `bat-lights.png`, `cobweb.png`, `spider.png`, `candy-corn.png`, `ghost.png` | same as above | **23 Oct** |
| `public/items/decoys/` | `pumpkin.png`, `cobweb.png`, `bat.png`, `ghost.png`, `skull.png` | same as above; decoys of the other tradition | **23 Oct** |
| `public/ui/` | `candy-chocolate.png`, `candy-sour-gummy.png`, `candy-chili-tamarind.png` | PNG transparent, 256x256, icons for the three difficulty levels | 30 Oct (can be drawn in code first) |
| `public/ui/` | `team-marigold.png`, `team-pumpkin.png` | PNG transparent, 256x256, team badges | 30 Oct (can be drawn in code first) |
| `public/audio/` | `music-lobby.mp3` | MP3 128 kbps, seamless loop, under 2 MB | 2 Nov |
| `public/audio/` | `music-game.mp3` | MP3 128 kbps, seamless loop, under 2 MB, normal tempo | 2 Nov |
| `public/audio/` | `music-hurry.mp3` | Same track as `music-game` about 20% faster, same key, seamless loop | 2 Nov |
| `public/audio/` | `sfx-correct.mp3`, `sfx-wrong.mp3`, `sfx-drop.mp3`, `sfx-click.mp3` | MP3, under 100 KB each, short | 2 Nov |
| `public/audio/` | `sfx-tick.mp3`, `sfx-tick-fast.mp3`, `sfx-alarm.mp3` | MP3, under 100 KB each. Tick is a short clock tick; fast tick is higher; alarm is about 1.5 s | 2 Nov |
| `data/` (repo root, not `public/`) | `questions.json` | UTF-8 JSON array of 300 questions (100 easy, 100 medium, 100 hard), format below. Already written, review before class | 30 Oct |
| `docs/mockups/` | any `*.png` | The approved Gemini screens, for style reference only | now |

## `data/questions.json` format

```json
[
  {
    "id": 1,
    "topic": "dod",
    "level": "easy",
    "question": "Which flower guides the spirits to the altar?",
    "options": ["Marigold", "Rose", "Sunflower", "Tulip"],
    "correct": 0,
    "fact": "Marigolds, called cempasuchil, guide spirits with their color and scent."
  }
]
```

Rules: `topic` is `dod`, `halloween` or `compare`; `level` is `easy`, `medium` or `hard`; exactly 4 options; `correct` is the index 0 to 3, spread evenly; `fact` is one sentence under 20 words; split 100/100/100 by topic and by level (the game asks the level of the difficulty chosen: easy, medium or hard). Review every `dod` fact by hand before delivering.

## Generated by the project, not by you

- `src/data/slots/<background-id>.json`: slot positions, produced by the `/dev/slots` editor after the backgrounds exist.
- `src/data/items.ts`: item list with anchors and allowed slot types, written during the build from your item file names.
- Placeholder images used until your files arrive.
