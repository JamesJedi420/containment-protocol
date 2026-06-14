/**
 * SPE-1309 slice 7: agent vitals / scoring side-effects from cognitive hazard simulation triggers.
 *
 * Syncs status flags and bounded stress/morale deltas from post-tick trigger summaries —
 * without mutating slice 1–6 compose/tick/trigger contracts or SPE-2108 / SPE-2116 hooks.
 */

import type { CognitiveHazardExposureRecordsMap, CognitiveHazardExposureReviewBand } from './cognitiveHazardEngine'
import { resolveCognitiveHazardSiblingRefKeys } from './cognitiveHazardSiblingCompose'
import {
  composeCognitiveHazardSimulationTriggerSubjectSummaries,
  type CognitiveHazardSimulationTriggerKind,
  type CognitiveHazardSimulationTriggerSubjectSummary,
} from './cognitiveHazardSimulationTriggers'
import type { Agent, AgentVitals, GameState } from './models'
import { COGNITIVE_HAZARD_CALIBRATION } from './sim/calibration'

export const COGNITIVE_HAZARD_DUTY_DEGRADED_STATUS_FLAG =
  'cognitive_hazard:duty_degraded' as const
export const COGNITIVE_HAZARD_KNOWLEDGE_DEGRADED_STATUS_FLAG =
  'cognitive_hazard:knowledge_degraded' as const
export const COGNITIVE_HAZARD_PROCEDURE_RESTRICTED_STATUS_FLAG =
  'cognitive_hazard:procedure_restricted' as const

export const COGNITIVE_HAZARD_SIMULATION_TRIGGER_STATUS_FLAGS = Object.freeze([
  COGNITIVE_HAZARD_DUTY_DEGRADED_STATUS_FLAG,
  COGNITIVE_HAZARD_KNOWLEDGE_DEGRADED_STATUS_FLAG,
  COGNITIVE_HAZARD_PROCEDURE_RESTRICTED_STATUS_FLAG,
] as const)

const TRIGGER_KIND_TO_STATUS_FLAG: Record<
  CognitiveHazardSimulationTriggerKind,
  (typeof COGNITIVE_HAZARD_SIMULATION_TRIGGER_STATUS_FLAGS)[number]
> = {
  agent_duty_degraded: COGNITIVE_HAZARD_DUTY_DEGRADED_STATUS_FLAG,
  knowledge_integrity_degraded: COGNITIVE_HAZARD_KNOWLEDGE_DEGRADED_STATUS_FLAG,
  procedure_restriction_active: COGNITIVE_HAZARD_PROCEDURE_RESTRICTED_STATUS_FLAG,
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(100, Math.max(0, value))
}

function resolveExposureReviewBandPriority(band: CognitiveHazardExposureReviewBand): number {
  switch (band) {
    case 'critical':
      return 3
    case 'elevated':
      return 2
    case 'stable':
      return 1
  }
}

function maxExposureReviewBand(
  left: CognitiveHazardExposureReviewBand,
  right: CognitiveHazardExposureReviewBand
): CognitiveHazardExposureReviewBand {
  return resolveExposureReviewBandPriority(left) >= resolveExposureReviewBandPriority(right)
    ? left
    : right
}

export function stripCognitiveHazardSimulationTriggerStatusFlags(
  flags: readonly string[] | undefined
): string[] {
  const cognitiveHazardFlagSet = new Set<string>(COGNITIVE_HAZARD_SIMULATION_TRIGGER_STATUS_FLAGS)
  return (flags ?? []).filter((flag) => !cognitiveHazardFlagSet.has(flag))
}

export function vitalsHasCognitiveHazardDutyDegraded(vitals: AgentVitals | undefined): boolean {
  return (vitals?.statusFlags ?? []).includes(COGNITIVE_HAZARD_DUTY_DEGRADED_STATUS_FLAG)
}

export function vitalsHasCognitiveHazardKnowledgeDegraded(vitals: AgentVitals | undefined): boolean {
  return (vitals?.statusFlags ?? []).includes(COGNITIVE_HAZARD_KNOWLEDGE_DEGRADED_STATUS_FLAG)
}

export function vitalsHasCognitiveHazardProcedureRestricted(vitals: AgentVitals | undefined): boolean {
  return (vitals?.statusFlags ?? []).includes(COGNITIVE_HAZARD_PROCEDURE_RESTRICTED_STATUS_FLAG)
}

function statusFlagsForTriggerKinds(
  kinds: readonly CognitiveHazardSimulationTriggerKind[]
): readonly string[] {
  return Object.freeze(
    kinds
      .map((kind) => TRIGGER_KIND_TO_STATUS_FLAG[kind])
      .sort((left, right) => left.localeCompare(right))
  )
}

/** Resolve roster agent ids linked to a cognitive hazard subject ref via normalized key overlap. */
export function resolveAgentIdsForCognitiveHazardSubjectRef(
  agents: GameState['agents'],
  subjectRef: string
): readonly string[] {
  const subjectKeys = new Set(resolveCognitiveHazardSiblingRefKeys(subjectRef))
  if (subjectKeys.size === 0) {
    return Object.freeze([] as string[])
  }

  const matches: string[] = []

  for (const agentId of Object.keys(agents).sort((left, right) => left.localeCompare(right))) {
    const agent = agents[agentId]
    if (!agent) {
      continue
    }

    const agentKeys = resolveCognitiveHazardSiblingRefKeys(`agent:${agentId}`)
    if (agentKeys.some((key) => subjectKeys.has(key))) {
      matches.push(agentId)
    }
  }

  return Object.freeze(matches)
}

export interface CognitiveHazardSimulationTriggerAgentVitalsEffect {
  readonly agentId: string
  readonly triggerKinds: readonly CognitiveHazardSimulationTriggerKind[]
  readonly exposureReviewBand: CognitiveHazardExposureReviewBand
  readonly statusFlags: readonly string[]
  readonly stressDelta: number
  readonly moraleDelta: number
}

function buildAgentVitalsEffectsByAgentId(input: {
  agents: GameState['agents']
  summaries: readonly CognitiveHazardSimulationTriggerSubjectSummary[]
}): Map<string, CognitiveHazardSimulationTriggerAgentVitalsEffect> {
  const effects = new Map<string, CognitiveHazardSimulationTriggerAgentVitalsEffect>()

  for (const summary of input.summaries) {
    const agentIds = resolveAgentIdsForCognitiveHazardSubjectRef(input.agents, summary.subjectRef)
    const statusFlags = statusFlagsForTriggerKinds(summary.triggerKinds)
    const stressDelta = COGNITIVE_HAZARD_CALIBRATION.stressDeltaByReviewBand[summary.exposureReviewBand]
    const moraleDelta = COGNITIVE_HAZARD_CALIBRATION.moraleDeltaByReviewBand[summary.exposureReviewBand]

    for (const agentId of agentIds) {
      const existing = effects.get(agentId)
      if (!existing) {
        effects.set(
          agentId,
          Object.freeze({
            agentId,
            triggerKinds: summary.triggerKinds,
            exposureReviewBand: summary.exposureReviewBand,
            statusFlags,
            stressDelta,
            moraleDelta,
          })
        )
        continue
      }

      const mergedKinds = Object.freeze(
        [...new Set([...existing.triggerKinds, ...summary.triggerKinds])].sort((left, right) =>
          left.localeCompare(right)
        )
      )
      const mergedBand = maxExposureReviewBand(existing.exposureReviewBand, summary.exposureReviewBand)

      effects.set(
        agentId,
        Object.freeze({
          agentId,
          triggerKinds: mergedKinds,
          exposureReviewBand: mergedBand,
          statusFlags: statusFlagsForTriggerKinds(mergedKinds),
          stressDelta:
            existing.stressDelta +
            COGNITIVE_HAZARD_CALIBRATION.stressDeltaByReviewBand[summary.exposureReviewBand],
          moraleDelta:
            existing.moraleDelta +
            COGNITIVE_HAZARD_CALIBRATION.moraleDeltaByReviewBand[summary.exposureReviewBand],
        })
      )
    }
  }

  return effects
}

function withCognitiveHazardVitalsEffect(
  agent: Agent,
  effect: CognitiveHazardSimulationTriggerAgentVitalsEffect | undefined
): Agent {
  const baseVitals = agent.vitals ?? {
    health: 100,
    stress: agent.fatigue ?? 0,
    wounds: 0,
    morale: Math.max(0, 100 - (agent.fatigue ?? 0)),
  }
  const strippedFlags = stripCognitiveHazardSimulationTriggerStatusFlags(baseVitals.statusFlags)

  if (!effect) {
    if (strippedFlags.length === (baseVitals.statusFlags ?? []).length) {
      return agent
    }

    return {
      ...agent,
      vitals: {
        ...baseVitals,
        statusFlags: strippedFlags.length > 0 ? strippedFlags : undefined,
      },
    }
  }

  return {
    ...agent,
    vitals: {
      ...baseVitals,
      stress: clampPercent((baseVitals.stress ?? 0) + effect.stressDelta),
      morale: clampPercent((baseVitals.morale ?? 50) + effect.moraleDelta),
      statusFlags: [...strippedFlags, ...effect.statusFlags],
    },
  }
}

/** Apply weekly vitals side-effects from active cognitive hazard simulation trigger summaries. */
export function applyCognitiveHazardSimulationTriggerVitalsToAgents(input: {
  agents: GameState['agents']
  nextRecords: CognitiveHazardExposureRecordsMap | null | undefined
  priorRecords?: CognitiveHazardExposureRecordsMap | null | undefined
}): GameState['agents'] {
  const summaries = composeCognitiveHazardSimulationTriggerSubjectSummaries(
    input.nextRecords,
    input.priorRecords
  )
  const effectsByAgentId = buildAgentVitalsEffectsByAgentId({
    agents: input.agents,
    summaries,
  })

  if (summaries.length === 0 && effectsByAgentId.size === 0) {
    let changed = false
    const nextAgents: GameState['agents'] = { ...input.agents }

    for (const agentId of Object.keys(input.agents).sort((left, right) => left.localeCompare(right))) {
      const agent = input.agents[agentId]
      if (!agent) {
        continue
      }

      const strippedFlags = stripCognitiveHazardSimulationTriggerStatusFlags(agent.vitals?.statusFlags)
      if (strippedFlags.length !== (agent.vitals?.statusFlags ?? []).length) {
        changed = true
        nextAgents[agentId] = withCognitiveHazardVitalsEffect(agent, undefined)
      }
    }

    return changed ? nextAgents : input.agents
  }

  const nextAgents: GameState['agents'] = { ...input.agents }

  for (const agentId of Object.keys(input.agents).sort((left, right) => left.localeCompare(right))) {
    const agent = input.agents[agentId]
    if (!agent) {
      continue
    }

    nextAgents[agentId] = withCognitiveHazardVitalsEffect(
      agent,
      effectsByAgentId.get(agentId)
    )
  }

  return nextAgents
}

export function resolveCognitiveHazardSimulationTriggerAgentVitalsEffects(input: {
  agents: GameState['agents']
  nextRecords: CognitiveHazardExposureRecordsMap | null | undefined
  priorRecords?: CognitiveHazardExposureRecordsMap | null | undefined
}): readonly CognitiveHazardSimulationTriggerAgentVitalsEffect[] {
  const summaries = composeCognitiveHazardSimulationTriggerSubjectSummaries(
    input.nextRecords,
    input.priorRecords
  )

  return Object.freeze(
    [...buildAgentVitalsEffectsByAgentId({ agents: input.agents, summaries }).values()].sort(
      (left, right) => left.agentId.localeCompare(right.agentId)
    )
  )
}
