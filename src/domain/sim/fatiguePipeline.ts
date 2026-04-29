import { clamp } from '../math'
import type { GameState, Team } from '../models'
import {
  accumulateFatigueChannels,
  applyChannelDifferentiatedRecovery,
  createDefaultFatigueChannels,
  resetCapabilityUsesPhaseCounter,
} from '../agentFatigueChannels'
import { getTeamMemberIds } from '../teamSimulation'

function getMissionFatigue(config: GameState['config']) {
  return config.durationModel === 'attrition'
    ? config.attritionPerWeek
    : Math.max(1, config.attritionPerWeek - 1)
}

function getRecoveryFatigue(config: GameState['config']) {
  return Math.max(1, Math.floor(config.attritionPerWeek / 2))
}

export function getAverageTeamFatigue(team: Team, agents: GameState['agents']) {
  const memberIds = getTeamMemberIds(team)

  if (memberIds.length === 0) {
    return 0
  }

  const totalFatigue = memberIds.reduce((sum, agentId) => sum + (agents[agentId]?.fatigue ?? 0), 0)

  return Math.round(totalFatigue / memberIds.length)
}

interface ApplyWeeklyAgentFatigueInput {
  agents: GameState['agents']
  teams: GameState['teams']
  config: GameState['config']
  activeTeamIds: string[]
  activeTeamStressModifiers?: Record<string, number>
}

export function applyWeeklyAgentFatigue({
  agents,
  teams,
  config,
  activeTeamIds,
  activeTeamStressModifiers = {},
}: ApplyWeeklyAgentFatigueInput): GameState['agents'] {
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
      const isActive = activeAgentIds.has(id)
      const isTraining = trainingAgentIds.has(id)

      const delta = isActive
        ? Math.max(1, Math.round(missionFatigue * (1 + (activeAgentStressById.get(id) ?? 0))))
        : isTraining
          ? 0
          : -recoveryFatigue

      const baseChannels = agent.fatigueChannels ?? createDefaultFatigueChannels()
      const updatedChannels = isActive
        ? accumulateFatigueChannels(baseChannels, { type: 'mission_deployment' })
        : isTraining
          ? accumulateFatigueChannels(baseChannels, { type: 'training' })
          : applyChannelDifferentiatedRecovery(baseChannels, 'rest')
      
      // SPE-130 Phase 3: reset capability use counter at end of weekly tick
      const resetChannels = resetCapabilityUsesPhaseCounter(updatedChannels)

      return [
        id,
        {
          ...agent,
          fatigue: clamp(agent.fatigue + delta, 0, 100),
          fatigueChannels: resetChannels,
        },
      ]
    })
  )
}
