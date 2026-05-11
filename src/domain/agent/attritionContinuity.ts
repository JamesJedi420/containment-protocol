// SPE-281: Cross-session attrition continuity — compact helpers for recap, reset, and format gating.

import { refreshContractBoard } from '../contracts'
import type { GameConfig, GameState } from '../models'
import { buildTeamDeploymentReadinessState } from '../deploymentReadiness'
import { recomputeMissionRouting } from '../missionIntakeRouting'
import { syncTeamSimulationState } from '../teamSimulation'
import {
  buildReplacementPressureState,
  computeReplacementPressure,
  DEFAULT_CRITICAL_REPLACEMENT_ROLES,
} from './attrition'

/**
 * Campaign formats that intentionally carry operative attrition and related pressure
 * across the same persistence path as the rest of `GameState` (browser reload / export).
 *
 * Matches `sanitizeGameConfig` in `runTransfer.ts`: `durationModel === 'attrition'` only
 * survives hydration when `challengeModeEnabled` is true; otherwise it is coerced to `capacity`.
 */
export function crossSessionAttritionPersistenceEnabled(
  config: Pick<GameConfig, 'durationModel' | 'challengeModeEnabled'>
): boolean {
  return config.challengeModeEnabled === true && config.durationModel === 'attrition'
}

export interface AttritionContinuityCounts {
  lost: number
  temporarilyUnavailable: number
  atRisk: number
  /**
   * Roster-only replacement pressure from lost operatives (`computeReplacementPressure`).
   * Excludes funding-derived penalties mixed into `buildReplacementPressureState`.
   */
  replacementPressure: number
  /** Count of operatives in `lost` attrition status (roster staffing gap). */
  staffingGap: number
}

export function countAttritionContinuity(state: GameState): AttritionContinuityCounts {
  let lost = 0
  let temporarilyUnavailable = 0
  let atRisk = 0

  for (const agent of Object.values(state.agents)) {
    const status = agent.attritionState?.attritionStatus
    if (status === 'lost') {
      lost += 1
    } else if (status === 'temporarily_unavailable') {
      temporarilyUnavailable += 1
    } else if (status === 'at_risk') {
      atRisk += 1
    }
  }

  const roster = computeReplacementPressure(
    Object.values(state.agents),
    [...DEFAULT_CRITICAL_REPLACEMENT_ROLES]
  )

  return {
    lost,
    temporarilyUnavailable,
    atRisk,
    replacementPressure: roster.replacementPressure,
    staffingGap: roster.staffingGap,
  }
}

/**
 * Single bounded recap line for operations / continuity surfaces (deterministic text).
 */
export function formatAttritionContinuitySummary(state: GameState): string {
  const c = countAttritionContinuity(state)
  return (
    `Cross-session attrition continuity: ${c.lost} lost, ` +
    `${c.temporarilyUnavailable} temporarily unavailable, ${c.atRisk} at risk; ` +
    `roster replacement pressure ${c.replacementPressure} (lost roster gap ${c.staffingGap}).`
  )
}

/**
 * Chapter-break reset: clears operative `attritionState` so a new arc can start clean
 * without a full new-run wipe. Does not remove agents or rewrite roster narrative fields
 * like name/role; re-derives team simulation + deployment readiness + contracts.
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

  let next: GameState = syncTeamSimulationState({ ...state, agents })

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
