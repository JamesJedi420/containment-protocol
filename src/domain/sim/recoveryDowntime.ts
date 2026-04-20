import type { FundingState, GameState, Id, ReplacementPressureState } from '../models'
import { clamp } from '../math'
import { RECOVERY_CALIBRATION } from './calibration'

export type RecoveryState = 'healthy' | 'recovering' | 'traumatized' | 'incapacitated'
export type DowntimeActivity = 'rest' | 'training' | 'therapy' | 'other'

export interface RecoveryProgressionResult {
  updatedAgents: GameState['agents']
  updatedTeams: GameState['teams']
  budgetPressureApplied: number
  attritionPressureApplied: number
  throughputPenaltyApplied: number
  attritionThroughputPenaltyApplied: number
}


export interface AdvanceRecoveryDowntimeInput {
  week: number
  sourceAgents: GameState['agents']
  sourceTeams: GameState['teams']
  downtimeAssignments: Record<Id, DowntimeActivity>
  fundingState?: FundingState
  replacementPressureState?: ReplacementPressureState
}

export function advanceRecoveryDowntimeForWeek({
  week,
  sourceAgents,
  sourceTeams,
  downtimeAssignments,
  fundingState,
  replacementPressureState,
}: AdvanceRecoveryDowntimeInput): RecoveryProgressionResult {
  const updatedAgents: GameState['agents'] = { ...sourceAgents }
  const updatedTeams: GameState['teams'] = { ...sourceTeams }
  const budgetPressureApplied = Math.max(0, Math.trunc(fundingState?.budgetPressure ?? 0))
  const attritionPressureApplied = Math.max(
    0,
    Math.trunc(replacementPressureState?.replacementPressure ?? 0)
  )
  let throughputPenaltyApplied = budgetPressureApplied >= 3 ? 2 : budgetPressureApplied >= 2 ? 1 : 0
  let attritionThroughputPenaltyApplied = attritionPressureApplied >= 4 ? 2 : attritionPressureApplied >= 2 ? 1 : 0
  // Support staff (medical) can reduce throughput penalty deterministically
  const combinedThroughputPenalty = throughputPenaltyApplied + attritionThroughputPenaltyApplied
  const therapyTraumaReductionPenalty = budgetPressureApplied >= 4 ? 1 : 0

  // 1. Apply downtime activity assignments and progress recovery/trauma deterministically
  for (const [agentId, agent] of Object.entries(sourceAgents)) {
    const downtime = downtimeAssignments[agentId] || 'rest'
    const inferredRecoveryStatus =
      agent.status === 'injured' ||
      agent.status === 'recovering' ||
      agent.assignment?.state === 'recovery'
        ? {
            state: 'recovering' as const,
            sinceWeek: agent.assignment?.startedWeek ?? agent.recoveryStatus?.sinceWeek ?? week,
          }
        : {
            state: 'healthy' as const,
            sinceWeek: agent.recoveryStatus?.sinceWeek ?? week,
          }
    let recoveryStatus = agent.recoveryStatus ?? inferredRecoveryStatus
    let trauma = agent.trauma || { traumaLevel: 0, traumaTags: [], lastEventWeek: week }
    let fatigue = agent.fatigue

    // Progression logic
    switch (recoveryStatus.state) {
      case 'healthy':
        if (trauma.traumaLevel > 0) {
          // Remain healthy but trauma persists
        }
        break
      case 'recovering':
        if (downtime === 'rest') {
          fatigue = clamp(
            fatigue -
              Math.max(
                0,
                RECOVERY_CALIBRATION.downtimeFatigueRecovery.rest - combinedThroughputPenalty
              ),
            0,
            100
          )
        }
        if (downtime === 'therapy') {
          fatigue = clamp(
            fatigue -
              Math.max(
                0,
                RECOVERY_CALIBRATION.downtimeFatigueRecovery.therapy - combinedThroughputPenalty
              ),
            0,
            100
          )
        }
        if (downtime === 'therapy' && trauma.traumaLevel > 0) {
          trauma = {
            ...trauma,
            traumaLevel: Math.max(
              0,
              trauma.traumaLevel -
                Math.max(
                  0,
                  RECOVERY_CALIBRATION.downtimeTherapyTraumaReduction -
                    therapyTraumaReductionPenalty
                )
            ),
            lastEventWeek: week,
          }
        }
        // If fatigue and trauma are both low, agent may return to healthy
        if (
          fatigue <= RECOVERY_CALIBRATION.healthyReturnFatigueThreshold &&
          trauma.traumaLevel === 0
        ) {
          recoveryStatus = { state: 'healthy', sinceWeek: week }
        }
        break
      case 'traumatized':
        if (downtime === 'therapy') {
          trauma = {
            ...trauma,
            traumaLevel: Math.max(
              0,
              trauma.traumaLevel -
                Math.max(
                  0,
                  RECOVERY_CALIBRATION.downtimeTherapyTraumaReduction -
                    therapyTraumaReductionPenalty
                )
            ),
            lastEventWeek: week,
          }
          if (trauma.traumaLevel === 0) {
            recoveryStatus = { state: 'recovering', sinceWeek: week }
          }
        }
        break
      case 'incapacitated':
        // No progression unless special event or therapy
        break
    }

    // Update agent state
    updatedAgents[agentId] = {
      ...agent,
      recoveryStatus,
      trauma,
      downtimeActivity: { activity: downtime, sinceWeek: week },
      fatigue,
    }
  }

  // 2. Aggregate team recovery pressure
  for (const [teamId, team] of Object.entries(sourceTeams)) {
    const memberIds = team.memberIds || team.agentIds || []
    let pressure = 0
    for (const agentId of memberIds) {
      const agent = updatedAgents[agentId]
      if (!agent) continue
      if (agent.recoveryStatus?.state === 'recovering') {
        pressure += RECOVERY_CALIBRATION.teamRecoveryPressureWeights.recovering
      }
      if (agent.recoveryStatus?.state === 'traumatized') {
        pressure += RECOVERY_CALIBRATION.teamRecoveryPressureWeights.traumatized
      }
      if (agent.recoveryStatus?.state === 'incapacitated') {
        pressure += RECOVERY_CALIBRATION.teamRecoveryPressureWeights.incapacitated
      }
      pressure +=
        (agent.trauma?.traumaLevel || 0) * RECOVERY_CALIBRATION.teamRecoveryPressureWeights.traumaLevel
    }
    updatedTeams[teamId] = {
      ...team,
      recoveryPressure:
        pressure +
        (throughputPenaltyApplied > 0 ? 0.5 : 0) +
        (attritionThroughputPenaltyApplied > 0
          ? attritionThroughputPenaltyApplied >= 2
            ? 1
            : 0.5
          : 0),
    }
  }

  return {
    updatedAgents,
    updatedTeams,
    budgetPressureApplied,
    attritionPressureApplied,
    throughputPenaltyApplied,
    attritionThroughputPenaltyApplied,
  }
}
