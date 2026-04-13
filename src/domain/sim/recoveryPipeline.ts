import {
  appendAgentHistoryEntries,
  appendAgentHistoryEntry,
  setAgentAssignment,
} from '../agent/lifecycle'
import { aggregateAbilityEffects, resolveAgentAbilityEffects } from '../abilities'
import { clamp } from '../math'
import type { Agent, AgentHistoryEntry, GameState } from '../models'
import { RECOVERY_CALIBRATION } from './calibration'
import { aggregateTraitEffects, resolveAgentTraitEffects } from '../traits'

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
    if (
      (agent.status !== 'injured' && agent.status !== 'recovering') ||
      agent.assignment?.state !== 'recovery'
    ) {
      continue
    }

    const severity = getInjurySeverityFlag(agent.vitals?.statusFlags) ?? 'minor'
    const startedWeek = agent.assignment.startedWeek ?? Math.max(0, week - 1)
      const elapsedWeeks = Math.max(0, week - startedWeek)
    const moraleRecoveryDelta = getRecoveryMoraleDelta(agent)

      if (elapsedWeeks >= getRecoveryDurationWeeks(severity)) {
      updatedAgents[agentId] = appendAgentHistoryEntry(
        setAgentAssignment(
          {
            ...agent,
            status: 'active',
            vitals: {
              ...(agent.vitals ?? {
                health: 100,
                stress: agent.fatigue,
                morale: Math.max(0, 100 - agent.fatigue),
                wounds: 0,
                statusFlags: [],
              }),
              health: 100,
              morale: clamp(
                Math.max(
                  agent.vitals?.morale ?? 100,
                  RECOVERY_CALIBRATION.returningMoraleFloor + moraleRecoveryDelta
                ),
                0,
                100
              ),
              wounds: 0,
              statusFlags: withInjuryFlags(agent.vitals?.statusFlags),
            },
          },
          { state: 'idle' }
        ),
        buildRecoveryHistoryEntry(week, `${agent.name} returned to active duty.`),
        { recoveryWeeks: 1 }
      )
      continue
    }

      if (elapsedWeeks >= 1 && agent.status === 'injured') {
      updatedAgents[agentId] = appendAgentHistoryEntry(
        {
          ...agent,
          status: 'recovering',
          vitals: {
            ...(agent.vitals ?? {
              health: 100,
              stress: agent.fatigue,
              morale: Math.max(0, 100 - agent.fatigue),
              wounds: severity === 'moderate' ? 25 : 10,
              statusFlags: [],
            }),
            morale: clamp(
              (agent.vitals?.morale ?? Math.max(0, 100 - agent.fatigue)) -
                RECOVERY_CALIBRATION.recoveringMoralePenalty +
                moraleRecoveryDelta,
              0,
              100
            ),
            wounds: severity === 'moderate' ? 25 : 10,
            statusFlags: withInjuryFlags(agent.vitals?.statusFlags, severity),
          },
        },
        buildRecoveryHistoryEntry(week, `${agent.name} is recovering from a ${severity} injury.`),
        { recoveryWeeks: 1 }
      )
      continue
    }

    if (agent.status === 'injured') {
      updatedAgents[agentId] = agent
      continue
    }

    updatedAgents[agentId] = appendAgentHistoryEntries(agent, [], { recoveryWeeks: 1 })
  }

  return updatedAgents
}

