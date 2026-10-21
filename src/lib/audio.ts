"use client";

// Sound and music with the Web Audio API (spec section 8). Nothing plays before the first tap
// (browsers block it), and a mute toggle always wins. Sound effects use the files in public/audio/ when
// they exist and a short synthesised sound when not, so the game is never silent by accident and never
// breaks on a missing file. Music is only played when its file exists: music-lobby, music-game and
// music-hurry (the faster copy). With no music-hurry, music-game speeds up with playbackRate instead.

import { MUSIC_MAX_RATE } from "@/lib/game/config";
import { isMuted, isReduced } from "./prefs";

export type Sfx = "click" | "drop" | "correct" | "wrong" | "tick" | "tickFast" | "beep" | "alarm";
export type MusicMode = "off" | "lobby" | "game";

const SFX_FILES: Partial<Record<Sfx, string>> = {
  click: "sfx-click",
  drop: "sfx-drop",
  correct: "sfx-correct",
  wrong: "sfx-wrong",
  tick: "sfx-tick",
  tickFast: "sfx-tick-fast",
  alarm: "sfx-alarm",
};
const MUSIC_VOLUME = 0.35;
const FADE_S = 0.8;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<string, AudioBuffer | null>(); // null = tried and not there
const loading = new Map<string, Promise<AudioBuffer | null>>();

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}
let wanted: MusicMode = "off";
let playing: { mode: MusicMode; game?: Voice; hurry?: Voice | null } | null = null;
let urgency = { rate: 1, hurry: false };

function load(name: string): Promise<AudioBuffer | null> {
  const known = buffers.get(name);
  if (known !== undefined) return Promise.resolve(known);
  let pending = loading.get(name);
  if (!pending) {
    pending = (async () => {
      try {
        const res = await fetch(`/audio/${name}.mp3`);
        if (!res.ok || !ctx) return null;
        return await ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        return null;
      }
    })().then((buffer) => {
      buffers.set(name, buffer);
      loading.delete(name);
      return buffer;
    });
    loading.set(name, pending);
  }
  return pending;
}

// Call from a tap or key press. Safe to call again.
export function unlockAudio() {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      master = ctx.createGain();
      master.connect(ctx.destination);
      master.gain.value = isMuted() ? 0 : 1;
      for (const file of Object.values(SFX_FILES)) void load(file);
    }
    if (ctx.state === "suspended") void ctx.resume();
    syncMusic();
  } catch {
    // no audio on this device: the game still works
  }
}

// Mute / unmute right away, music included.
export function refreshMuted() {
  if (ctx && master) master.gain.setTargetAtTime(isMuted() ? 0 : 1, ctx.currentTime, 0.05);
}

function tone(freq: number, seconds: number, type: OscillatorType, volume: number, delay = 0, to?: number) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + seconds);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + seconds + 0.02);
}

const SYNTH: Record<Sfx, () => void> = {
  click: () => tone(880, 0.05, "square", 0.08),
  drop: () => tone(240, 0.14, "sine", 0.25, 0, 110),
  correct: () => {
    tone(660, 0.12, "triangle", 0.2);
    tone(880, 0.2, "triangle", 0.2, 0.11);
  },
  wrong: () => tone(300, 0.3, "sawtooth", 0.12, 0, 150),
  tick: () => tone(1000, 0.035, "square", 0.07),
  tickFast: () => tone(1500, 0.035, "square", 0.09),
  beep: () => tone(1800, 0.12, "sine", 0.18),
  alarm: () => {
    for (let i = 0; i < 4; i++) tone(i % 2 ? 660 : 880, 0.3, "square", 0.12, i * 0.37);
  },
};

export function playSfx(name: Sfx) {
  if (!ctx || !master || isMuted() || ctx.state !== "running") return;
  try {
    const file = SFX_FILES[name];
    const buffer = file ? buffers.get(file) : null;
    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(master);
      source.start();
    } else {
      SYNTH[name]();
    }
    if (name === "alarm" && !isReduced()) navigator.vibrate?.(200); // Android only, optional
  } catch {
    // a failed sound is never worth an error
  }
}

// ---------- music ----------

function voice(buffer: AudioBuffer, volume: number): Voice | null {
  if (!ctx || !master) return null;
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  source.loop = true;
  gain.gain.value = 0;
  gain.gain.setTargetAtTime(volume, ctx.currentTime, FADE_S / 3);
  source.connect(gain).connect(master);
  source.start();
  return { source, gain };
}

function stopVoice(v: Voice | null | undefined) {
  if (!v || !ctx) return;
  v.gain.gain.setTargetAtTime(0, ctx.currentTime, FADE_S / 3);
  v.source.stop(ctx.currentTime + FADE_S + 0.2);
}

function applyUrgency() {
  if (!ctx || !playing || playing.mode !== "game" || !playing.game) return;
  const { game, hurry } = playing;
  if (hurry) {
    // Two copies at the same tempo: crossfade to the faster one.
    game.gain.gain.setTargetAtTime(urgency.hurry ? 0 : MUSIC_VOLUME, ctx.currentTime, FADE_S / 3);
    hurry.gain.gain.setTargetAtTime(urgency.hurry ? MUSIC_VOLUME : 0, ctx.currentTime, FADE_S / 3);
  } else {
    game.source.playbackRate.setTargetAtTime(Math.min(urgency.rate, MUSIC_MAX_RATE), ctx.currentTime, 0.4);
  }
}

// Starts or switches the music to what is wanted. Does nothing before the first tap or when files are missing.
function syncMusic() {
  if (!ctx) return;
  if (playing && playing.mode === wanted) return;
  const old = playing;
  playing = null;
  if (old) {
    stopVoice(old.game);
    stopVoice(old.hurry);
  }
  if (wanted === "off") return;
  const mode = wanted;
  void (async () => {
    const [main, fast] = await Promise.all([load(mode === "lobby" ? "music-lobby" : "music-game"), mode === "game" ? load("music-hurry") : null]);
    if (wanted !== mode || playing || !main) return; // changed its mind while loading, or no file
    const game = voice(main, MUSIC_VOLUME);
    const hurry = fast ? voice(fast, 0) : null;
    if (!game) return;
    playing = { mode, game, hurry };
    applyUrgency();
  })();
}

export function setMusicMode(mode: MusicMode) {
  wanted = mode;
  if (mode !== "game") urgency = { rate: 1, hurry: false };
  syncMusic();
}

// From the play timer: how fast the music should run, and whether to crossfade to the hurry track.
export function setMusicUrgency(rate: number, hurry: boolean) {
  urgency = { rate, hurry };
  applyUrgency();
}
