import {
  appendAgentHistoryEntries,
  appendAgentHistoryEntry,
  setAgentAssignment,
} from '../agent/lifecycle'
import { aggregateAbilityEffects, resolveAgentAbilityEffects } from '../abilities'
import { clamp } from '../math'
import type { Agent, AgentHistoryEntry, GameState } from '../models'
import { RECOVERY_CALIBRATION } from './calibration'
import { vitalsHasExposureResidue } from './recoveryImpairments'
import { aggregateTraitEffects, resolveAgentTraitEffects } from '../traits'
import { createSimulationAgentVitalsBaseline } from '../agentDefaults'

const MINOR_RECOVERY_DURATION_WEEKS = RECOVERY_CALIBRATION.minorRecoveryDurationWeeks
const MODERATE_RECOVERY_DURATION_WEEKS = RECOVERY_CALIBRATION.moderateRecoveryDurationWeeks

export type InjurySeverity = 'minor' | 'moderate'

interface AdvanceRecoveryInput {
  week: number
  sourceAgents: GameState['agents']
  nextAgents: GameState['agents']
}

export function getRecoveryDurationWeeks(severity: InjurySeverity) {
  return severity === 'moderate' ? MODERATE_RECOVERY_DURATION_WEEKS : MINOR_RECOVERY_DURATION_WEEKS
}

function getInjurySeverityFlag(flags: string[] | undefined): InjurySeverity | null {
  if ((flags ?? []).includes('injury:moderate')) {
    return 'moderate'
  }

  if ((flags ?? []).includes('injury:minor')) {
    return 'minor'
  }

  return null
}

export function withInjuryFlags(flags: string[] | undefined, severity?: InjurySeverity) {
  const nextFlags = (flags ?? []).filter(
    (flag) => flag !== 'injured' && flag !== 'recovering' && !flag.startsWith('injury:')
  )

  if (severity) {
    nextFlags.push(`injury:${severity}`)
  }

  return nextFlags
}

function buildRecoveryHistoryEntry(week: number, note: string): AgentHistoryEntry {
  return {
    week,
    eventType: 'simulation.weekly_tick',
    note,
  }
}

function getRecoveryMoraleDelta(agent: Agent) {
  const traitEffects = aggregateTraitEffects(
    resolveAgentTraitEffects(agent, {
      phase: 'recovery',
    })
  )
  const abilityEffects = aggregateAbilityEffects(
    resolveAgentAbilityEffects(agent, {
      phase: 'recovery',
    })
  )

  return traitEffects.moraleRecoveryDelta + abilityEffects.moraleRecoveryDelta
}

export function advanceRecoveryAgentsForWeek({
  week,
  sourceAgents,
  nextAgents,
}: AdvanceRecoveryInput): GameState['agents'] {
  const updatedAgents = { ...nextAgents }

  for (const [agentId, agent] of Object.entries(sourceAgents)) {
    const priorAgent = updatedAgents[agentId] ?? nextAgents[agentId] ?? agent

    if (
      (priorAgent.status !== 'injured' && priorAgent.status !== 'recovering') ||
      priorAgent.assignment?.state !== 'recovery'
    ) {
      continue
    }

    const severity = getInjurySeverityFlag(priorAgent.vitals?.statusFlags) ?? 'minor'
    const startedWeek = priorAgent.assignment.startedWeek ?? Math.max(0, week - 1)
    const elapsedWeeks = Math.max(0, week - startedWeek)
    const moraleRecoveryDelta = getRecoveryMoraleDelta(priorAgent)

    if (elapsedWeeks >= getRecoveryDurationWeeks(severity)) {
      if (vitalsHasExposureResidue(priorAgent.vitals)) {
        updatedAgents[agentId] = appendAgentHistoryEntry(
          priorAgent,
          buildRecoveryHistoryEntry(
            week,
            `${priorAgent.name} remains in recovery until exposure residue is cleared under medical washdown.`
          ),
          { recoveryWeeks: 1 }
        )
        continue
      }
      updatedAgents[agentId] = appendAgentHistoryEntry(
        setAgentAssignment(
          {
            ...priorAgent,
            status: 'active',
            vitals: {
              ...(priorAgent.vitals ?? createSimulationAgentVitalsBaseline(priorAgent.fatigue)),
              health: 100,
              morale: clamp(
                Math.max(
                  priorAgent.vitals?.morale ?? 100,
                  RECOVERY_CALIBRATION.returningMoraleFloor + moraleRecoveryDelta
                ),
                0,
                100
              ),
              wounds: 0,
              statusFlags: withInjuryFlags(priorAgent.vitals?.statusFlags),
            },
          },
          { state: 'idle' }
        ),
        buildRecoveryHistoryEntry(week, `${priorAgent.name} returned to active duty.`),
        { recoveryWeeks: 1 }
      )
      continue
    }

    if (elapsedWeeks >= 1 && priorAgent.status === 'injured') {
      updatedAgents[agentId] = appendAgentHistoryEntry(
        {
          ...priorAgent,
          status: 'recovering',
          vitals: {
            ...(priorAgent.vitals ??
              createSimulationAgentVitalsBaseline(
                priorAgent.fatigue,
                severity === 'moderate' ? 25 : 10
              )),
            morale: clamp(
              (priorAgent.vitals?.morale ?? Math.max(0, 100 - priorAgent.fatigue)) -
                RECOVERY_CALIBRATION.recoveringMoralePenalty +
                moraleRecoveryDelta,
              0,
              100
            ),
            wounds: severity === 'moderate' ? 25 : 10,
            statusFlags: withInjuryFlags(priorAgent.vitals?.statusFlags, severity),
          },
        },
        buildRecoveryHistoryEntry(week, `${priorAgent.name} is recovering from a ${severity} injury.`),
        { recoveryWeeks: 1 }
      )
      continue
    }

    if (priorAgent.status === 'injured') {
      updatedAgents[agentId] = priorAgent
      continue
    }

    updatedAgents[agentId] = appendAgentHistoryEntries(priorAgent, [], { recoveryWeeks: 1 })
  }

  return updatedAgents
}

