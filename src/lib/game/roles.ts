// Who describes and who builds in each play (spec section 3, Rounds and plays). One phone per team.

import type { Team } from "./types";

export interface PlayRoles {
  describerTeam: Team;
  builderTeam: Team;
}

// Play x.0: Team Marigold describes. Play x.1: roles swap.
export function rolesForPlay(playIdx: number): PlayRoles {
  if (!Number.isInteger(playIdx) || playIdx < 0) throw new Error(`bad play index ${playIdx}`);
  return playIdx % 2 === 0 ? { describerTeam: 1, builderTeam: 2 } : { describerTeam: 2, builderTeam: 1 };
}
