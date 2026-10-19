import { GameImage } from "./GameImage";

// Bust portrait in a circle. public/avatars/01.png ... 50.png; a numbered colour disc until the files exist.
export function Avatar({ n, size = 40, className = "" }: { n: number; size?: number; className?: string }) {
  const file = String(n).padStart(2, "0");
  return (
    <GameImage
      src={`/avatars/${file}.png`}
      label={String(n)}
      variant="avatar"
      className={`shrink-0 rounded-full bg-indigo-800 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
