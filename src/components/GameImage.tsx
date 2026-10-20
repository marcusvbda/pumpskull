"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// Image from public/ that turns into a labelled placeholder shape if the file is missing. Never throws.

const PALETTE = ["#f59e0b", "#14b8a6", "#ec4899", "#8b5cf6", "#f97316", "#22c55e", "#06b6d4", "#eab308"];

function colourFor(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

interface Props {
  src: string;
  label: string; // alt text, and the text on the placeholder
  className?: string;
  style?: CSSProperties;
  variant?: "item" | "scene";
}

export function GameImage({ src, label, className = "", style, variant = "item" }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const ref = useRef<HTMLImageElement>(null);
  const failed = failedSrc === src;

  // The error can fire before hydration, when React is not listening yet.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailedSrc(src);
  }, [src]);

  if (failed) {
    const shape =
      variant === "scene"
        ? "rounded-xl bg-indigo-950 text-indigo-300 border-2 border-dashed border-indigo-500"
        : "rounded-2xl text-indigo-950 border-2 border-indigo-950/40";
    return (
      <div
        role="img"
        aria-label={label}
        className={`flex items-center justify-center text-center font-bold leading-tight select-none ${shape} ${className}`}
        style={{ ...(variant === "scene" ? {} : { background: colourFor(label) }), fontSize: "clamp(8px, 2.2vw, 14px)", ...style }}
      >
        <span className="px-1">{label}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- plain img so a missing file can fall back to a placeholder
    <img
      ref={ref}
      src={src}
      alt={label}
      draggable={false}
      onError={() => setFailedSrc(src)}
      className={`select-none object-contain ${className}`}
      style={style}
    />
  );
}
