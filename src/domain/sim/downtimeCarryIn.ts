import type { Agent } from '../agent/models'
import type { AgentDeploymentCarryInStamp, GameState, Id } from '../models'
import { getTeamMemberIds } from '../teamSimulation'
import { DOWNTIME_CARRY_IN_CALIBRATION } from './calibration'
import { OFF_BOOKS_COURIER_LOCKOUT_TAG } from './downtimeSideWork'
import { vitalsHasExposureResidue } from './recoveryImpairments'

/**
 * SPE-1701: deterministic per-agent carry-in from post-downtime posture.
 * Negative path takes precedence over positive when both could apply.
 * SPE-1700 hardening: courier lockout is evaluated before residue/therapy so side-work access
 * consequences are not masked by overlapping exposure residue.
 */
export function computeDowntimeCarryInForAgent(
  agent: Agent,
  week: number
): AgentDeploymentCarryInStamp | undefined {
  const foregone = agent.downtimeActivity?.foregoneThisInterval
  const hasResidue = vitalsHasExposureResidue(agent.vitals)
  const forewentTherapy = foregone?.includes('therapy')

  if (agent.tags.includes(OFF_BOOKS_COURIER_LOCKOUT_TAG)) {
    return {
      readinessDelta: -DOWNTIME_CARRY_IN_CALIBRATION.offBooksCourierLockoutReadinessPenalty,
      code: 'off-books-courier-lockout',
      stampedWeek: week,
    }
  }

  if (hasResidue && forewentTherapy) {
    return {
      readinessDelta: -DOWNTIME_CARRY_IN_CALIBRATION.residueTherapyForegoneReadinessPenalty,
      code: 'residue-therapy-foregone',
      stampedWeek: week,
    }
  }

  const recoveryOk = !agent.recoveryStatus || agent.recoveryStatus.state === 'healthy'
  const traumaOk = (agent.trauma?.traumaLevel ?? 0) === 0
  const fatigue = agent.fatigue
  const restWeek = agent.downtimeActivity?.activity === 'rest'
  const stableEnergy = agent.energyBudget?.reserveBand === 'stable'

  if (
    restWeek &&
    stableEnergy &&
    fatigue <= DOWNTIME_CARRY_IN_CALIBRATION.wellRestedFatigueCeiling &&
    recoveryOk &&
    traumaOk &&
    !hasResidue
  ) {
    return {
      readinessDelta: DOWNTIME_CARRY_IN_CALIBRATION.wellRestedStableEnergyReadinessBonus,
      code: 'well-rested-stable-energy',
      stampedWeek: week,
    }
  }

  return undefined
}

/**
 * Rebuild carry-in stamps for every operative on every team currently assigned to the case.
 * Call after assignment mutations so the map matches roster reality. Also run after **field-base
 * staging rotation** (`applyFieldBaseStagingRotationAtWeekOpen`) so mid-contract swaps do not leave
 * stale stamps for rotated-out operatives or omit rotated-in operatives during first-week readiness.
 */
export function rebuildDeploymentCarryInForCase(
  state: GameState,
  caseId: Id
): Record<Id, AgentDeploymentCarryInStamp> | undefined {
  const caseData = state.cases[caseId]
  if (!caseData || caseData.status !== 'in_progress' || caseData.assignedTeamIds.length === 0) {
    return undefined
  }

  const out: Record<Id, AgentDeploymentCarryInStamp> = {}
  for (const teamId of caseData.assignedTeamIds) {
    const team = state.teams[teamId]
    if (!team) continue
    for (const agentId of getTeamMemberIds(team)) {
      const agent = state.agents[agentId]
      if (!agent) continue
      const stamp = computeDowntimeCarryInForAgent(agent, state.week)
      if (stamp) {
        out[agentId] = stamp
      }
    }
  }

  return Object.keys(out).length > 0 ? out : undefined
}
