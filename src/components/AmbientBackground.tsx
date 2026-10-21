"use client";

// Animated night backdrop behind every screen: a hillside town along the bottom, soft drifting colour glows, slow twinkling stars and marigold
// embers rising. Transform/opacity animations only (cheap on phones), nothing faster than 0.25 Hz, no flashing.
// "Reduce effects" (or prefers-reduced-motion) freezes everything and hides the embers. Decoration only.

import type { CSSProperties } from "react";
import { usePrefs } from "@/lib/prefs";

// Fixed layouts so server and client render the same markup (no Math.random).
const EMBERS = [
  { x: 6, size: 6, dur: 22, delay: -4 },
  { x: 14, size: 4, dur: 28, delay: -18 },
  { x: 23, size: 7, dur: 25, delay: -10 },
  { x: 33, size: 4, dur: 30, delay: -23 },
  { x: 41, size: 6, dur: 24, delay: -2 },
  { x: 52, size: 5, dur: 27, delay: -15 },
  { x: 61, size: 7, dur: 23, delay: -8 },
  { x: 70, size: 4, dur: 31, delay: -26 },
  { x: 78, size: 6, dur: 26, delay: -12 },
  { x: 86, size: 5, dur: 29, delay: -20 },
  { x: 93, size: 7, dur: 24, delay: -6 },
  { x: 47, size: 4, dur: 32, delay: -29 },
];

const STARS = [
  { x: 9, y: 12, size: 2, dur: 5, delay: 0 },
  { x: 27, y: 6, size: 3, dur: 7, delay: -2 },
  { x: 44, y: 16, size: 2, dur: 6, delay: -4 },
  { x: 63, y: 9, size: 3, dur: 8, delay: -1 },
  { x: 81, y: 14, size: 2, dur: 5, delay: -3 },
  { x: 92, y: 7, size: 3, dur: 7, delay: -5 },
  { x: 18, y: 38, size: 2, dur: 6, delay: -2 },
  { x: 74, y: 34, size: 2, dur: 8, delay: -6 },
  { x: 36, y: 56, size: 3, dur: 7, delay: -1 },
  { x: 88, y: 52, size: 2, dur: 5, delay: -4 },
  { x: 12, y: 72, size: 2, dur: 8, delay: -3 },
  { x: 58, y: 80, size: 3, dur: 6, delay: -5 },
];

export function AmbientBackground() {
  const { reduced } = usePrefs();
  return (
    <div aria-hidden className={`ambient ${reduced ? "ambient-still" : ""}`}>
      <div className="ambient-glow ambient-glow-purple" />
      <div className="ambient-glow ambient-glow-orange" />
      <div className="ambient-glow ambient-glow-teal" />
      {/* eslint-disable-next-line @next/next/no-img-element -- decoration, a missing file simply shows nothing */}
      <img src="/brand/skyline.png" alt="" draggable={false} className="ambient-skyline" />
      {STARS.map((s, i) => (
        <span
          key={`s${i}`}
          className="ambient-star"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, "--dur": `${s.dur}s`, "--delay": `${s.delay}s` } as CSSProperties}
        />
      ))}
      {EMBERS.map((e, i) => (
        <span
          key={`e${i}`}
          className="ambient-ember"
          style={{ left: `${e.x}%`, width: e.size, height: e.size, "--dur": `${e.dur}s`, "--delay": `${e.delay}s` } as CSSProperties}
        />
      ))}
    </div>
  );
}
