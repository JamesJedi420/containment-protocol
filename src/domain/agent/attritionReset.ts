import { refreshContractBoard } from '../contracts'
import { buildTeamDeploymentReadinessState } from '../deploymentReadiness'
import type { GameState } from '../models'
import { recomputeMissionRouting } from '../missionIntakeRouting'
import { syncTeamSimulationState } from '../teamSimulation'
import { buildReplacementPressureState } from './attrition'

/**
 * Rebuilds agent/team-dependent derived state after any availability mutation
 * (hydration, chapter-break resets) so routing, readiness, pressure, and contracts
 * stay aligned from a single canonical sequence.
 */
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

  const deploymentMomentum: GameState['deploymentMomentum'] =
    state.deploymentMomentum !== undefined
      ? {
          stacks: 0,
          lastChangeWeek: state.week,
          lastSummary: 'Chapter break cleared deployment momentum stacks.',
        }
      : undefined

  return recomputeAttritionDerivedState({ ...state, agents, deploymentMomentum })
}
