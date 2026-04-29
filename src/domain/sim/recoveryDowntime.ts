import type {
  FundingState,
  GameState,
  Id,
  ReplacementPressureState,
  SupportStaffSummary,
} from '../models'
import { clamp } from '../math'
import { RECOVERY_CALIBRATION } from './calibration'
import type { AnyOperationEventDraft } from '../events'

export type RecoveryState = 'healthy' | 'recovering' | 'traumatized' | 'incapacitated'
export type DowntimeActivity = 'rest' | 'training' | 'therapy' | 'other' | 'coping'

export interface RecoveryProgressionResult {
  updatedAgents: GameState['agents']
  updatedTeams: GameState['teams']
  budgetPressureApplied: number
  attritionPressureApplied: number
  throughputPenaltyApplied: number
  attritionThroughputPenaltyApplied: number
  eventDrafts: AnyOperationEventDraft[]
}


export interface AdvanceRecoveryDowntimeInput {
  week: number
  sourceAgents: GameState['agents']
  sourceTeams: GameState['teams']
  downtimeAssignments: Record<Id, DowntimeActivity>
  fundingState?: FundingState
  replacementPressureState?: ReplacementPressureState
  supportStaff?: SupportStaffSummary
  substancePolicy?: 'permitted' | 'restricted' | 'prohibited'
}

export function advanceRecoveryDowntimeForWeek({
  week,
  sourceAgents,
  sourceTeams,
  downtimeAssignments,
  fundingState,
  replacementPressureState,
  supportStaff,
  substancePolicy,
}: AdvanceRecoveryDowntimeInput): RecoveryProgressionResult {
  const updatedAgents: GameState['agents'] = { ...sourceAgents }
  const updatedTeams: GameState['teams'] = { ...sourceTeams }
  const eventDrafts: AnyOperationEventDraft[] = []
  const budgetPressureApplied = Math.max(0, Math.trunc(fundingState?.budgetPressure ?? 0))
  const attritionPressureApplied = Math.max(
    0,
    Math.trunc(replacementPressureState?.replacementPressure ?? 0)
  )
  let throughputPenaltyApplied = budgetPressureApplied >= 3 ? 2 : budgetPressureApplied >= 2 ? 1 : 0
  const attritionThroughputPenaltyApplied = attritionPressureApplied >= 4 ? 2 : attritionPressureApplied >= 2 ? 1 : 0
  // Support staff (medical) can reduce throughput penalty deterministically
  const medicalRelief = Math.max(
    0,
    (supportStaff?.medical ?? 0) >= 8 ? 2 : (supportStaff?.medical ?? 0) >= 4 ? 1 : 0
  )
  throughputPenaltyApplied = Math.max(0, throughputPenaltyApplied - medicalRelief)
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
    let agentTags = agent.tags
    let agentVitals = agent.vitals
    let copingStreak = agent.copingStreak ?? 0

    if (downtime === 'coping') {
      // SPE-1070 slice 1: off-duty coping (alcohol family)
      const policy = substancePolicy ?? 'permitted'
      const applyRelief = policy !== 'prohibited'

      // Apply fatigue/morale relief (gated by policy)
      if (applyRelief) {
        fatigue = clamp(fatigue - RECOVERY_CALIBRATION.copingFatigueRelief, 0, 100)
        agentVitals = {
          health: agentVitals?.health ?? 100,
          stress: agentVitals?.stress ?? 0,
          wounds: agentVitals?.wounds ?? 0,
          morale: clamp(
            (agentVitals?.morale ?? 50) + RECOVERY_CALIBRATION.copingMoraleRelief,
            0,
            100
          ),
          statusFlags: agentVitals?.statusFlags ?? [],
        }
      } else {
        // Prohibited: apply morale penalty
        agentVitals = {
          health: agentVitals?.health ?? 100,
          stress: agentVitals?.stress ?? 0,
          wounds: agentVitals?.wounds ?? 0,
          morale: clamp(
            (agentVitals?.morale ?? 50) - RECOVERY_CALIBRATION.copingProhibitedMoralePenalty,
            0,
            100
          ),
          statusFlags: agentVitals?.statusFlags ?? [],
        }
      }

      // Set impaired:alcohol flag for next week (idempotent)
      const baseFlags = agentVitals.statusFlags ?? []
      agentVitals = {
        ...agentVitals,
        statusFlags: baseFlags.includes('impaired:alcohol')
          ? baseFlags
          : [...baseFlags, 'impaired:alcohol'],
      }

      // Increment streak and gate dependency-risk tag
      copingStreak += 1
      if (copingStreak >= RECOVERY_CALIBRATION.copingDependencyThreshold) {
        agentTags = agentTags.includes('dependency-risk:alcohol')
          ? agentTags
          : [...agentTags, 'dependency-risk:alcohol']
      }

      // Emit coping-applied event
      eventDrafts.push({
        type: 'staff.coping.applied',
        sourceSystem: 'agent',
        payload: { week, agentId, streak: copingStreak, policy },
      })

      // Emit misconduct event for restricted or prohibited policy
      if (policy === 'restricted' || policy === 'prohibited') {
        eventDrafts.push({
          type: 'staff.coping.misconduct',
          sourceSystem: 'agent',
          payload: { week, agentId, policy },
        })
      }
    } else {
      // Non-coping activity: reset streak and clear dependency-risk tag if streak was non-zero
      if (copingStreak > 0) {
        copingStreak = 0
        agentTags = agentTags.filter((t) => t !== 'dependency-risk:alcohol')
      }
    }

    updatedAgents[agentId] = {
      ...agent,
      recoveryStatus,
      trauma,
      downtimeActivity: { activity: downtime, sinceWeek: week },
      fatigue,
      vitals: agentVitals,
      tags: agentTags,
      copingStreak,
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
    eventDrafts,
  }
}
