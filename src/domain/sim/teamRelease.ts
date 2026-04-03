import { type GameState } from '../models'

export function releaseTeamsFromCases(
  teams: GameState['teams'],
  releasedTeamIds: readonly string[]
): GameState['teams'] {
  if (releasedTeamIds.length === 0) {
    return teams
  }

  const releasedTeamIdSet = new Set(releasedTeamIds)

  return Object.fromEntries(
    Object.entries(teams).map(([id, team]) => [
      id,
      releasedTeamIdSet.has(id)
        ? {
            ...team,
            assignedCaseId: undefined,
            status: team.status
              ? { ...team.status, assignedCaseId: null }
              : team.status,
          }
        : team,
    ])
  )
}