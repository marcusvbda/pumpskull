import type { ButtonHTMLAttributes } from "react";
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
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      type="button"
      {...props}
      className={`min-h-12 rounded-2xl border-b-4 px-5 py-2 text-lg font-extrabold transition-transform enabled:active:translate-y-0.5 enabled:active:border-b-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  );
}

const FLAGS = ["bg-pink-500", "bg-teal-400", "bg-amber-400", "bg-purple-500", "bg-orange-500", "bg-sky-400"];

// Papel picado banner (decoration only).
export function PapelPicado() {
  return (
    <div aria-hidden className="flex w-full">
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className={`h-7 flex-1 ${FLAGS[i % FLAGS.length]} [clip-path:polygon(0_0,100%_0,100%_100%,75%_75%,50%_100%,25%_75%,0_100%)]`}
        />
      ))}
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PapelPicado />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-4 pb-6">{children}</main>
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
      className={big ? "mx-auto h-28 w-full max-w-72" : "h-10 w-40"}
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
