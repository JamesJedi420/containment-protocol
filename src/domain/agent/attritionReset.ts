import { refreshContractBoard } from '../contracts'
import { buildTeamDeploymentReadinessState } from '../deploymentReadiness'
import type { GameState } from '../models'
import { recomputeMissionRouting } from '../missionIntakeRouting'
import { syncTeamSimulationState } from '../teamSimulation'
import { buildReplacementPressureState } from './attrition'

export function recomputeAttritionDerivedState(state: GameState): GameState {
  let next: GameState = syncTeamSimulationState(state)

  next = {
    ...next,
    replacementPressureState: buildReplacementPressureState(next),
  }

  next = {
    ...next,
    missionRouting: recomputeMissionRouting(next),
  }

  next = {
    ...next,
    teams: Object.fromEntries(
      Object.entries(next.teams).map(([teamId, team]) => [
        teamId,
        {
          ...team,
          deploymentReadinessState: buildTeamDeploymentReadinessState(next, teamId),
        },
      ])
    ),
  }

  return refreshContractBoard(next)
}

/**
 * Chapter-break reset: clears operative `attritionState` so a new arc can start clean
 * without a full new-run wipe. Does not remove agents or rewrite roster narrative fields
 * like name/role.
 */
export function applyChapterBreakAttritionReset(state: GameState): GameState {
  const agents = Object.fromEntries(
    Object.entries(state.agents).map(([agentId, agent]) => {
      if (agent.attritionState === undefined) {
        return [agentId, agent]
      }
      const nextAgent = { ...agent }
      delete nextAgent.attritionState
      return [agentId, nextAgent]
    })
  )

  return recomputeAttritionDerivedState({ ...state, agents })
}
