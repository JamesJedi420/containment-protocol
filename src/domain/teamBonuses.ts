import type { GameState, LeaderBonus } from './models'
import { buildTeamCompositionProfile, getTeamMemberIds } from './teamSimulation'

export function buildAssignedTeamLeaderBonuses(
  teamIds: string[],
  teams: GameState['teams'],
  agents: GameState['agents']
): Record<string, LeaderBonus> {
  return Object.fromEntries(
    teamIds
      .map((teamId) => {
        const team = teams[teamId]
        if (!team) return null
        return [teamId, buildTeamCompositionProfile(team, agents).leaderBonus] as const
      })
      .filter((entry): entry is readonly [string, LeaderBonus] => Boolean(entry))
  )
}

export function buildAssignedAgentLeaderBonuses(
  teamIds: string[],
  teams: GameState['teams'],
  agents: GameState['agents']
): Record<string, LeaderBonus> {
  const teamLeaderBonuses = buildAssignedTeamLeaderBonuses(teamIds, teams, agents)
  return Object.fromEntries(
    teamIds.flatMap((teamId) => {
      const team = teams[teamId]
      const leaderBonus = teamLeaderBonuses[teamId]
      if (!team || !leaderBonus) return []
      return getTeamMemberIds(team).map((agentId) => [agentId, leaderBonus] as const)
    })
  )
}
