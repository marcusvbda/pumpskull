import type { Team } from "@/lib/game/types";

// Colour is never the only signal (spec section 8): every team also has a name and an icon.
export const TEAM_META: Record<Team, { name: string; icon: string; panel: string; title: string; badge: string }> = {
  1: {
    name: "Team Marigold",
    icon: "✿",
    panel: "border-yellow-300/70 bg-yellow-300/10",
    title: "text-yellow-200",
    badge: "bg-yellow-300 text-indigo-950",
  },
  2: {
    name: "Team Pumpkin",
    icon: "🎃",
    panel: "border-orange-500/80 bg-orange-500/10",
    title: "text-orange-300",
    badge: "bg-orange-500 text-indigo-950",
  },
};
