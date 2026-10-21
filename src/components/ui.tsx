import type { ButtonHTMLAttributes } from "react";
import { playSfx } from "@/lib/audio";
import { DIFFICULTY, type Difficulty } from "@/lib/game/config";
import { GameImage } from "./GameImage";

// Chunky button with a darker bottom edge (mockup style). Min height 48 px for touch.
const VARIANTS = {
  primary: "bg-amber-400 text-indigo-950 border-amber-600",
  secondary: "bg-indigo-600 text-white border-indigo-900",
  ghost: "bg-transparent text-indigo-100 border-transparent underline",
} as const;

export function Button({
  variant = "primary",
  className = "",
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      type="button"
      {...props}
      onClick={(event) => {
        playSfx("click");
        onClick?.(event);
      }}
      className={`min-h-12 rounded-2xl border-b-4 px-5 py-2 text-lg font-extrabold transition-transform enabled:active:translate-y-0.5 enabled:active:border-b-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  );
}

// Hanging garland at the top of every screen (decoration only; renders nothing if the file is missing).
// One garland across the top, shown whole at its own proportions (never tiled or cropped). Hidden on very short screens.
export function Garland() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- decoration, a missing file simply shows nothing
    <img
      src="/brand/banner.png"
      alt=""
      aria-hidden
      draggable={false}
      className="pointer-events-none mx-auto block h-auto w-full max-w-2xl shrink-0 select-none [@media(max-height:620px)]:hidden"
    />
  );
}

// `center`: short screens sit in the middle of the whole screen. The bottom padding equals the garland height, so the
// middle of the content is the middle of the viewport. Dense screens leave it off and use every pixel.
export function Shell({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Garland />
      <main
        className={`mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-2 px-4 pt-1 pb-2 ${
          center ? "justify-center pb-[calc(min(100vw,42rem)_*_640_/_2130)] [@media(max-height:620px)]:pb-2" : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}

export function Logo({ size = "lg" }: { size?: "sm" | "lg" }) {
  const big = size === "lg";
  return (
    <GameImage
      src="/brand/logo.png"
      label="PUMPSKULL"
      variant="scene"
      className={big ? "mx-auto aspect-[1950/800] w-full max-w-80" : "aspect-[1950/800] h-12"}
      style={{ fontSize: big ? 32 : 18, fontWeight: 900, letterSpacing: "0.1em", color: "#fbbf24" }}
    />
  );
}

export function Mascot({ difficulty, size = 96 }: { difficulty: Difficulty; size?: number }) {
  return (
    <GameImage
      src={`/brand/mascot-${difficulty}.png`}
      label={`${DIFFICULTY[difficulty].label} mascot`}
      style={{ width: size, height: size }}
    />
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-400 bg-red-950/60 px-3 py-2 text-sm font-semibold text-red-200">
      {children}
    </p>
  );
}
