// Synthesises the game music and sound effects into public/audio/*.mp3 (needs ffmpeg for the MP3 encode).
// Usage: node scripts/audio/generate.mjs [outDir]
// Music loops are rendered as a circular buffer (note tails wrap around) and the reverb is run twice, keeping the
// second pass, so the loop point has no click or gap. music-hurry is the same piece at 1.2x tempo, same key.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = process.argv[2] ?? join(root, "public/audio");
mkdirSync(outDir, { recursive: true });

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const TAU = Math.PI * 2;

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1;
  };
}

// ---------- instruments: (t, freq) -> sample, t in seconds since the note started ----------

const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));

const INSTRUMENTS = {
  // Marimba: a fundamental plus a short bright overtone near 4x.
  marimba: { len: 0.9, fn: (t, f) => env(t, 0.002, 0.18) * (Math.sin(TAU * f * t) + 0.35 * env(t, 0, 0.05) * Math.sin(TAU * f * 3.99 * t) + 0.12 * Math.sin(TAU * f * 9.9 * t) * env(t, 0, 0.02)) },
  // Celesta / music-box bell.
  celesta: { len: 1.8, fn: (t, f) => env(t, 0.003, 0.5) * (Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * f * 2.01 * t) * env(t, 0, 0.25) + 0.18 * Math.sin(TAU * f * 5.4 * t) * env(t, 0, 0.08)) },
  // Nylon-guitar style pluck for the chord stabs.
  pluck: { len: 0.6, fn: (t, f) => env(t, 0.002, 0.14) * (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 2 * t) * env(t, 0, 0.1) + 0.25 * Math.sin(TAU * f * 3 * t) * env(t, 0, 0.06)) },
  bass: { len: 0.7, fn: (t, f) => env(t, 0.004, 0.22) * (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 2 * t)) },
  pad: { len: 3.5, fn: (t, f, d) => Math.min(1, t / 0.5) * Math.min(1, Math.max(0, (d + 0.6 - t) / 0.6)) * (Math.sin(TAU * f * t) * 0.6 + Math.sin(TAU * f * 1.003 * t) * 0.4 + 0.25 * Math.sin(TAU * f * 2 * t)) },
};

// ---------- rendering ----------

class Track {
  constructor(seconds) {
    this.n = Math.round(seconds * SR);
    this.l = new Float32Array(this.n);
    this.r = new Float32Array(this.n);
    this.noise = seeded(7);
  }
  // Adds a note; the buffer is circular so tails past the end wrap to the start.
  note(inst, start, dur, midi, gain, pan = 0) {
    const { len, fn } = INSTRUMENTS[inst];
    const f = hz(midi);
    const total = Math.round((inst === "pad" ? dur + 0.8 : Math.min(len, dur + 0.6)) * SR);
    const s0 = Math.round(start * SR);
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4), gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < total; i++) {
      const v = fn(i / SR, f, dur);
      const k = (s0 + i) % this.n;
      this.l[k] += v * gl;
      this.r[k] += v * gr;
    }
  }
  // Percussion built from noise and sine sweeps.
  perc(kind, start, gain, pan = 0) {
    const s0 = Math.round(start * SR);
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4), gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    let len, fn;
    if (kind === "kick") { len = 0.28; fn = (t) => Math.sin(TAU * (45 * t + (90 / 28) * (1 - Math.exp(-28 * t)))) * Math.exp(-t * 16); }
    else if (kind === "shaker") { len = 0.09; let p = 0; fn = (t) => { const x = this.noise(); const h = x - p; p = x; return h * Math.exp(-t * 55) * 0.8; }; }
    else if (kind === "clave") { len = 0.1; fn = (t) => Math.sin(TAU * 1850 * t) * Math.exp(-t * 70); }
    else if (kind === "rim") { len = 0.14; let p = 0; fn = (t) => { const x = this.noise(); const h = x - p; p = x; return (h * 0.6 + Math.sin(TAU * 400 * t) * 0.5) * Math.exp(-t * 40); }; }
    else { len = 0.1; fn = () => 0; }
    const total = Math.round(len * SR);
    for (let i = 0; i < total; i++) {
      const v = fn(i / SR);
      const k = (s0 + i) % this.n;
      this.l[k] += v * gl;
      this.r[k] += v * gr;
    }
  }
}

// Schroeder-style reverb on stereo buffers, run over two passes so the wrapped loop is seamless.
function reverb(track, wet) {
  const n = track.n;
  const make = (src) => {
    const dbl = new Float32Array(n * 2);
    dbl.set(src, 0);
    dbl.set(src, n);
    const out = new Float32Array(n * 2);
    for (const [delayMs, fb] of [[29.7, 0.78], [37.1, 0.76], [41.1, 0.74], [43.7, 0.72]]) {
      const d = Math.round((delayMs * SR) / 1000);
      const buf = new Float32Array(d);
      let lp = 0;
      for (let i = 0; i < n * 2; i++) {
        const y = buf[i % d];
        lp += (y - lp) * 0.35;
        buf[i % d] = dbl[i] + lp * fb;
        out[i] += y * 0.25;
      }
    }
    for (const [delayMs, g] of [[5.0, 0.7], [1.7, 0.7]]) {
      const d = Math.round((delayMs * SR) / 1000);
      const buf = new Float32Array(d);
      for (let i = 0; i < n * 2; i++) {
        const x = out[i], idx = i % d;
        const y = -g * x + buf[idx];
        buf[idx] = x + g * y;
        out[i] = y;
      }
    }
    return out.subarray(n);
  };
  const wl = make(track.l), wr = make(track.r);
  for (let i = 0; i < n; i++) {
    track.l[i] = track.l[i] * (1 - wet * 0.3) + wl[i] * wet * 1.3 + wr[i] * wet * 0.2;
    track.r[i] = track.r[i] * (1 - wet * 0.3) + wr[i] * wet * 1.3 + wl[i] * wet * 0.2;
  }
}

function normalise(l, r, peak = 0.89) {
  let m = 0;
  for (let i = 0; i < l.length; i++) m = Math.max(m, Math.abs(l[i]), Math.abs(r[i]));
  const k = m > 0 ? peak / m : 1;
  for (let i = 0; i < l.length; i++) { l[i] *= k; r[i] *= k; }
}

function toMp3(name, l, r, { bitrate = "128k" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pumpskull-audio-"));
  try {
    const n = l.length;
    const buf = Buffer.alloc(44 + n * 4);
    buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
    buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
    for (let i = 0; i < n; i++) {
      buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(l[i] * 32767))), 44 + i * 4);
      buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(r[i] * 32767))), 46 + i * 4);
    }
    const wav = join(dir, `${name}.wav`);
    writeFileSync(wav, buf);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", wav, "-codec:a", "libmp3lame", "-b:a", bitrate, "-ar", String(SR), join(outDir, `${name}.mp3`)]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log("wrote", `${name}.mp3`, (n_seconds(l) ).toFixed(2) + " s");
}
const n_seconds = (l) => l.length / SR;

// ---------- the music ----------

// Game piece, A minor. One entry per bar; melody beats are inside the bar (4 beats).
const GAME_BARS = ["Am", "Am", "F", "F", "C", "C", "G", "E", "Am", "Am", "F", "F", "C", "C", "G", "E"];
const CH = {
  Am: { root: 45, stab: [57, 60, 64] }, F: { root: 41, stab: [57, 60, 65] }, C: { root: 48, stab: [55, 60, 64] },
  G: { root: 43, stab: [55, 59, 62] }, E: { root: 40, stab: [56, 59, 64] },
};
const GAME_MELODY = [
  [[0, 69, 0.75], [0.75, 72, 0.25], [1, 76, 1], [2.5, 74, 0.5], [3, 72, 0.5], [3.5, 69, 0.5]],
  [[0, 71, 0.75], [0.75, 72, 0.25], [1, 69, 1], [2, 64, 1.5]],
  [[0, 65, 0.75], [0.75, 69, 0.25], [1, 72, 1], [2.5, 71, 0.5], [3, 69, 0.5], [3.5, 65, 0.5]],
  [[0, 67, 0.75], [0.75, 69, 0.25], [1, 72, 1.5], [3, 69, 1]],
  [[0, 72, 0.75], [0.75, 76, 0.25], [1, 79, 1], [2.5, 76, 0.5], [3, 74, 0.5], [3.5, 72, 0.5]],
  [[0, 74, 0.75], [0.75, 72, 0.25], [1, 67, 1], [2, 64, 1.5]],
  [[0, 67, 0.5], [0.5, 71, 0.5], [1, 74, 1], [2, 71, 0.5], [2.5, 74, 0.5], [3, 79, 1]],
  [[0, 76, 0.75], [0.75, 71, 0.25], [1, 68, 1], [2, 71, 0.5], [2.5, 76, 0.5], [3, 80, 1]],
  [[0, 81, 1], [1, 79, 0.5], [1.5, 76, 0.5], [2, 72, 1], [3, 76, 1]],
  [[0, 74, 0.5], [0.5, 72, 0.5], [1, 71, 1], [2, 69, 2]],
  [[0, 77, 1], [1, 76, 0.5], [1.5, 72, 0.5], [2, 69, 1], [3, 72, 1]],
  [[0, 74, 0.5], [0.5, 72, 0.5], [1, 69, 1], [2, 65, 2]],
  [[0, 79, 1], [1, 76, 0.5], [1.5, 72, 0.5], [2, 76, 1], [3, 79, 1]],
  [[0, 77, 0.5], [0.5, 76, 0.5], [1, 74, 1], [2, 72, 2]],
  [[0, 71, 0.5], [0.5, 74, 0.5], [1, 79, 1], [2, 74, 0.5], [2.5, 71, 0.5], [3, 67, 1]],
  [[0, 68, 0.5], [0.5, 71, 0.5], [1, 76, 1], [2, 80, 1], [3, 76, 1]],
];

function renderGame(bpm) {
  const spb = 60 / bpm, bars = GAME_BARS.length, t = new Track(bars * 4 * spb);
  GAME_BARS.forEach((name, b) => {
    const c = CH[name], T = b * 4 * spb;
    // Bass: root, fifth, root, octave (a simple tumbao).
    for (const [beat, off, d] of [[0, 0, 0.9], [1.5, 7, 0.4], [2, 0, 0.9], [3.5, 12, 0.4]]) t.note("bass", T + beat * spb, d * spb, c.root + off, 0.42, -0.1);
    // Chord stabs on the off beats.
    for (const beat of [1, 2.5, 3.5]) c.stab.forEach((m, i) => t.note("pluck", T + beat * spb + i * 0.012, 0.3 * spb, m, 0.12, -0.35 + i * 0.1));
    // Percussion.
    t.perc("kick", T, 0.55); t.perc("kick", T + 2 * spb, 0.5);
    for (let i = 0; i < 8; i++) t.perc("shaker", T + i * 0.5 * spb, i % 2 ? 0.05 : 0.08, 0.3);
    t.perc("clave", T + 1.5 * spb, 0.12, 0.45); t.perc("clave", T + 3 * spb, 0.09, 0.45);
    // Pad under the chords for warmth, low in the mix.
    c.stab.forEach((m) => t.note("pad", T, 4 * spb, m - 12, 0.05, 0));
    // Melody on marimba, doubled softly an octave up in the second half.
    for (const [beat, m, d] of GAME_MELODY[b]) {
      t.note("marimba", T + beat * spb, d * spb, m, 0.3, 0.15);
      if (b >= 8) t.note("celesta", T + beat * spb, d * spb, m + 12, 0.06, -0.2);
    }
  });
  reverb(t, 0.2);
  normalise(t.l, t.r);
  return t;
}

// Lobby: calmer, D minor, slow, with a music-box tune over a soft pad.
const LOBBY_BARS = ["Dm", "Dm", "Bb", "Bb", "F", "F", "C", "A", "Dm", "Bb", "Gm", "Gm", "Bb", "C", "A", "A"];
const LCH = {
  Dm: { root: 38, notes: [62, 65, 69] }, Bb: { root: 46, notes: [58, 62, 65] }, F: { root: 41, notes: [57, 60, 65] }, C: { root: 48, notes: [55, 60, 64] },
  A: { root: 45, notes: [57, 61, 64] }, Gm: { root: 43, notes: [55, 58, 62] },
};
const LOBBY_TUNE = [
  [[0, 74, 1.5], [1.5, 77, 0.5], [2, 76, 1], [3, 74, 1]],
  [[0, 72, 1], [1, 74, 1], [2, 69, 2]],
  [[0, 70, 1.5], [1.5, 74, 0.5], [2, 72, 1], [3, 70, 1]],
  [[0, 69, 1], [1, 70, 1], [2, 65, 2]],
  [[0, 72, 1.5], [1.5, 77, 0.5], [2, 76, 1], [3, 72, 1]],
  [[0, 74, 1], [1, 72, 1], [2, 69, 2]],
  [[0, 67, 1], [1, 72, 1], [2, 76, 1], [3, 72, 1]],
  [[0, 73, 1.5], [1.5, 76, 0.5], [2, 81, 2]],
  [[0, 81, 1.5], [1.5, 77, 0.5], [2, 76, 1], [3, 74, 1]],
  [[0, 74, 1], [1, 70, 1], [2, 77, 2]],
  [[0, 74, 1.5], [1.5, 70, 0.5], [2, 67, 1], [3, 70, 1]],
  [[0, 74, 2], [2, 72, 1], [3, 70, 1]],
  [[0, 77, 1], [1, 74, 1], [2, 70, 1], [3, 74, 1]],
  [[0, 79, 1], [1, 76, 1], [2, 72, 2]],
  [[0, 76, 1], [1, 73, 1], [2, 69, 1], [3, 73, 1]],
  [[0, 76, 2], [2, 73, 1], [3, 69, 1]],
];

function renderLobby(bpm = 78) {
  const spb = 60 / bpm, bars = LOBBY_BARS.length, t = new Track(bars * 4 * spb);
  LOBBY_BARS.forEach((name, b) => {
    const c = LCH[name], T = b * 4 * spb;
    t.note("bass", T, 1.8 * spb, c.root, 0.3, -0.1); t.note("bass", T + 2 * spb, 1.8 * spb, c.root + (b % 2 ? 7 : 0), 0.24, -0.1);
    c.notes.forEach((m) => t.note("pad", T, 4 * spb, m, 0.07, 0));
    // Rocking arpeggio on the celesta, quiet.
    c.notes.concat([c.notes[1] + 12, c.notes[2] + 12, c.notes[1] + 12, c.notes[0] + 12]).slice(0, 8).forEach((m, i) => t.note("celesta", T + i * 0.5 * spb, 0.5 * spb, m + 12, 0.055, i % 2 ? 0.3 : -0.3));
    t.perc("shaker", T + 1 * spb, 0.05, 0.3); t.perc("shaker", T + 3 * spb, 0.05, 0.3);
    if (b % 2 === 0) t.perc("kick", T, 0.28);
    for (const [beat, m, d] of LOBBY_TUNE[b]) t.note("marimba", T + beat * spb, d * spb, m, 0.22, 0.2);
  });
  reverb(t, 0.28);
  normalise(t.l, t.r);
  return t;
}

// ---------- sound effects ----------

function sfx(seconds, voices) {
  const t = new Track(seconds);
  voices(t);
  normalise(t.l, t.r, 0.8);
  return t;
}

const EFFECTS = {
  "sfx-click": () => sfx(0.06, (t) => { t.note("pluck", 0, 0.03, 91, 0.5); t.perc("clave", 0, 0.3); }),
  "sfx-drop": () => sfx(0.22, (t) => { t.perc("kick", 0, 0.8); t.note("marimba", 0, 0.1, 55, 0.4); }),
  "sfx-correct": () => sfx(0.75, (t) => { [72, 76, 79, 84].forEach((m, i) => t.note("marimba", i * 0.075, 0.3, m, 0.5, (i - 1.5) * 0.15)); t.note("celesta", 0.225, 0.4, 91, 0.25); }),
  "sfx-wrong": () => sfx(0.55, (t) => { t.note("bass", 0, 0.2, 52, 0.7); t.note("bass", 0.17, 0.3, 47, 0.7); t.note("pluck", 0, 0.2, 40, 0.3); }),
  "sfx-tick": () => sfx(0.06, (t) => t.perc("clave", 0, 0.9)),
  "sfx-tick-fast": () => sfx(0.06, (t) => { t.note("pluck", 0, 0.03, 100, 0.6); t.perc("clave", 0, 0.5); }),
  "sfx-alarm": () => sfx(1.6, (t) => { [83, 76, 83, 76, 83].forEach((m, i) => { t.note("celesta", i * 0.3, 0.28, m, 0.6); t.note("marimba", i * 0.3, 0.28, m - 12, 0.35); }); }),
};

// ---------- go ----------

const game = renderGame(112);
toMp3("music-game", game.l, game.r);
const hurry = renderGame(112 * 1.2);
toMp3("music-hurry", hurry.l, hurry.r);
const lobby = renderLobby();
toMp3("music-lobby", lobby.l, lobby.r);
for (const [name, make] of Object.entries(EFFECTS)) {
  const t = make();
  toMp3(name, t.l, t.r, { bitrate: "96k" });
}
