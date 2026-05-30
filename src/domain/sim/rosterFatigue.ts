import { isAgentAttritionUnavailable } from '../agent/attrition'
import type { Agent, GameState } from '../models'

/** Agents whose fatigue counts toward weekly `avgFatigue` (deployable / live roster). */
export function isRosterFatigueAgent(agent: Agent | undefined): agent is Agent {
  if (!agent) {
    return false
  }

  if (agent.status === 'dead' || agent.status === 'resigned') {
    return false
  }

  if (agent.assignment?.state === 'training') {
    return false
  }

  if (isAgentAttritionUnavailable(agent)) {
    return false
  }

  return true
}

export function getAverageRosterFatigue(agents: GameState['agents']) {
  const values = Object.values(agents).filter(isRosterFatigueAgent)

  if (values.length === 0) {
    return 0
  }

  return Math.round(values.reduce((sum, agent) => sum + agent.fatigue, 0) / values.length)
}
