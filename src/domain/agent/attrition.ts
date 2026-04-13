// Deterministic Operative Attrition, Loss, & Replacement Pressure Logic
// This module implements progression, status, and pressure logic for agent attrition/loss.

import type { Agent, AgentRole } from './models'
import type {
  AgentAttritionState,
  GameState,
  ReplacementPressureState,
} from '../models'
import { ATTRITION_CALIBRATION } from '../sim/calibration'
import { assessFundingPressure } from '../funding'

export const DEFAULT_CRITICAL_REPLACEMENT_ROLES = [
  'field_recon',
  'investigator',
  'tech',
  'medic',
] as const satisfies readonly AgentRole[]

export interface AttritionPressureAssessment {
  replacementPressure: number
  staffingGap: number
  activeLossCount: number
  criticalRoleLossCount: number
  temporaryUnavailableCount: number
  activeUnavailableCount: number
  constrained: boolean
  severeConstraint: boolean
  deploymentTriagePenalty: number
  deploymentSetupDelayWeeks: number
  recoveryThroughputPenalty: number
  teamRecoveryPressurePenalty: number
  recruitmentPriorityBand: 'stable' | 'elevated' | 'critical'
  reasonCodes: string[]
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.length > 0))].sort((left, right) =>
    left.localeCompare(right)
  )
}

export function isAgentAttritionUnavailable(agent: Pick<Agent, 'attritionState'>) {
  const attritionStatus = agent.attritionState?.attritionStatus

  return attritionStatus === 'lost' || attritionStatus === 'temporarily_unavailable'
}

/**
 * Progresses the attrition state for an agent deterministically based on current state and week.
 * Returns the updated AgentAttritionState.
 */
export function progressAttritionState(
  prev: AgentAttritionState,
  currentWeek: number
): AgentAttritionState {
  // Example deterministic logic (expand as needed):
  if (prev.attritionStatus === 'temporarily_unavailable' && prev.returnEligibleWeek && currentWeek >= prev.returnEligibleWeek) {
    return {
      ...prev,
      attritionStatus: 'active',
      attritionCategory: undefined,
      attritionSinceWeek: undefined,
      returnEligibleWeek: undefined,
      lossReasonCodes: [],
      retentionPressure: Math.max(0, prev.retentionPressure - 1),
    }
  }
  // If agent is lost, status remains
  if (prev.attritionStatus === 'lost') {
    return prev
  }
  // At-risk logic (example: escalate to loss after N weeks)
  if (
    prev.attritionStatus === 'at_risk' &&
    prev.attritionSinceWeek &&
    currentWeek - prev.attritionSinceWeek >= ATTRITION_CALIBRATION.atRiskLossAfterWeeks
  ) {
    return {
      ...prev,
      attritionStatus: 'lost',
      attritionCategory: prev.attritionCategory ?? 'burnout',
      lossReasonCodes: [...prev.lossReasonCodes, 'timed_out'],
    }
  }
  // Default: no change
  return prev
}

/**
 * Computes replacement pressure and staffing gap for a set of agents.
 * Returns a ReplacementPressureState.
 */
export function computeReplacementPressure(
  agents: Agent[],
  criticalRoles: string[]
): ReplacementPressureState {
  const lostAgents = agents.filter(a => a.attritionState?.attritionStatus === 'lost')
  const criticalRoleLossCount = lostAgents.filter(a => criticalRoles.includes(a.role)).length
  const replacementPressure = Math.min(
    ATTRITION_CALIBRATION.maxReplacementPressure,
    lostAgents.length + Math.max(0, criticalRoleLossCount - 1)
  )
  return {
    replacementPressure,
    staffingGap: lostAgents.length,
    activeLossCount: lostAgents.length,
    criticalRoleLossCount,
    replacementBacklog: [], // fill from backlog system
  }
}

export function computeReplacementPressureWithFunding(
  agents: Agent[],
  criticalRoles: string[],
  fundingPressurePenalty: number
): ReplacementPressureState {
  const base = computeReplacementPressure(agents, criticalRoles)

  return {
    ...base,
    replacementPressure: Math.min(
      ATTRITION_CALIBRATION.maxReplacementPressure,
      base.replacementPressure + Math.max(0, Math.trunc(fundingPressurePenalty))
    ),
  }
}

export function buildReplacementPressureState(
  state: Pick<GameState, 'agents' | 'agency' | 'config' | 'funding' | 'week'>,
  criticalRoles: readonly string[] = DEFAULT_CRITICAL_REPLACEMENT_ROLES
): ReplacementPressureState {
  const fundingPressure = assessFundingPressure(state)

  return computeReplacementPressureWithFunding(
    Object.values(state.agents),
    [...criticalRoles],
    fundingPressure.replacementPressurePenalty
  )
}

export function assessAttritionPressure(
  state: Pick<GameState, 'agents' | 'agency' | 'config' | 'funding' | 'week'>,
  criticalRoles: readonly string[] = DEFAULT_CRITICAL_REPLACEMENT_ROLES
): AttritionPressureAssessment {
  const replacementPressureState = buildReplacementPressureState(state, criticalRoles)
  const temporaryUnavailableCount = Object.values(state.agents).filter(
    (agent) => agent.attritionState?.attritionStatus === 'temporarily_unavailable'
  ).length
  const activeUnavailableCount =
    replacementPressureState.activeLossCount + temporaryUnavailableCount
  const constrained =
    replacementPressureState.replacementPressure >= 2 ||
    replacementPressureState.staffingGap > 0 ||
    temporaryUnavailableCount > 0
  const severeConstraint =
    replacementPressureState.replacementPressure >= 4 ||
    replacementPressureState.staffingGap >= 2 ||
    replacementPressureState.criticalRoleLossCount >= 2

  return {
    replacementPressure: replacementPressureState.replacementPressure,
    staffingGap: replacementPressureState.staffingGap,
    activeLossCount: replacementPressureState.activeLossCount,
    criticalRoleLossCount: replacementPressureState.criticalRoleLossCount,
    temporaryUnavailableCount,
    activeUnavailableCount,
    constrained,
    severeConstraint,
    deploymentTriagePenalty: Math.min(
      8,
      replacementPressureState.replacementPressure + (temporaryUnavailableCount > 0 ? 1 : 0)
    ),
    deploymentSetupDelayWeeks: severeConstraint ? 1 : 0,
    recoveryThroughputPenalty: severeConstraint ? 2 : constrained ? 1 : 0,
    teamRecoveryPressurePenalty: severeConstraint ? 1 : constrained ? 0.5 : 0,
    recruitmentPriorityBand: severeConstraint
      ? 'critical'
      : constrained
        ? 'elevated'
        : 'stable',
    reasonCodes: uniqueSorted([
      replacementPressureState.replacementPressure > 0
        ? `replacement-pressure:${replacementPressureState.replacementPressure}`
        : '',
      replacementPressureState.staffingGap > 0
        ? `staffing-gap:${replacementPressureState.staffingGap}`
        : '',
      replacementPressureState.criticalRoleLossCount > 0
        ? `critical-role-losses:${replacementPressureState.criticalRoleLossCount}`
        : '',
      temporaryUnavailableCount > 0
        ? `temporary-unavailable:${temporaryUnavailableCount}`
        : '',
    ]),
  }
}
