import { clamp } from './math'
import type { GameState } from './models'
import { getTeamMemberIds } from './teamSimulation'

export function getMissionFatigue(config: GameState['config']) {
  return config.durationModel === 'attrition'
    ? config.attritionPerWeek
    : Math.max(1, config.attritionPerWeek - 1)
}

export function getRecoveryFatigue(config: GameState['config']) {
  return Math.max(1, Math.floor(config.attritionPerWeek / 2))
}

export function applyAgentFatigue(
  agents: GameState['agents'],
  teams: GameState['teams'],
  config: GameState['config'],
  activeTeamIds: string[],
  activeTeamStressModifiers: Record<string, number> = {}
) {
  const activeAgentStressById = new Map<string, number>()
  const activeAgentIds = new Set(
    activeTeamIds.flatMap((teamId) => {
      const team = teams[teamId]
      const memberIds = team ? getTeamMemberIds(team) : []
      const stressModifier = activeTeamStressModifiers[teamId] ?? 0
      for (const agentId of memberIds) {
        activeAgentStressById.set(agentId, stressModifier)
      }
      return memberIds
    })
  )
  const trainingAgentIds = new Set(
    Object.entries(agents)
      .filter(([, agent]) => agent.assignment?.state === 'training')
      .map(([agentId]) => agentId)
  )
  const missionFatigue = getMissionFatigue(config)
  const recoveryFatigue = getRecoveryFatigue(config)

  return Object.fromEntries(
    Object.entries(agents).map(([id, agent]) => {
      const delta = activeAgentIds.has(id)
        ? Math.max(1, Math.round(missionFatigue * (1 + (activeAgentStressById.get(id) ?? 0))))
        : trainingAgentIds.has(id)
          ? -(agent.recoveryRateBonus ?? 0)
          : -(recoveryFatigue + (agent.recoveryRateBonus ?? 0))
      return [
        id,
        {
          ...agent,
          fatigue: clamp(agent.fatigue + delta, 0, 100),
        },
      ]
    })
  )
}
