import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
  COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
  COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
  type CognitiveHazardExposureRecord,
} from '../domain/cognitiveHazardEngine'
import {
  applyCognitiveHazardSimulationTriggerVitalsToAgents,
  COGNITIVE_HAZARD_KNOWLEDGE_DEGRADED_STATUS_FLAG,
  COGNITIVE_HAZARD_PROCEDURE_RESTRICTED_STATUS_FLAG,
  resolveAgentIdsForCognitiveHazardSubjectRef,
  vitalsHasCognitiveHazardDutyDegraded,
  vitalsHasCognitiveHazardKnowledgeDegraded,
} from '../domain/cognitiveHazardSimulationTriggerVitals'

function memeticFixtureForAgent(agentId: string): CognitiveHazardExposureRecord {
  return {
    ...COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
    subjectRef: `agent:${agentId}`,
  }
}

describe('cognitiveHazardSimulationTriggerVitals (SPE-1309 slice 7)', () => {
  it('resolves roster agent ids from agent-prefixed subject refs', () => {
    const state = createStartingState()

    expect(resolveAgentIdsForCognitiveHazardSubjectRef(state.agents, 'agent:a_mina')).toEqual([
      'a_mina',
    ])
    expect(resolveAgentIdsForCognitiveHazardSubjectRef(state.agents, 'agent:missing-id')).toEqual(
      []
    )
  })

  it('is a no-op for empty exposure maps without throwing', () => {
    const state = createStartingState()

    expect(
      applyCognitiveHazardSimulationTriggerVitalsToAgents({
        agents: state.agents,
        nextRecords: {},
      })
    ).toBe(state.agents)
  })

  it('applies knowledge-degraded status flag and stress delta for memetic escalation fixture', () => {
    const state = createStartingState()
    const record = memeticFixtureForAgent('a_mina')
    const priorStress = state.agents.a_mina?.vitals?.stress ?? 0

    const nextAgents = applyCognitiveHazardSimulationTriggerVitalsToAgents({
      agents: state.agents,
      nextRecords: { [record.id]: record },
    })

    expect(vitalsHasCognitiveHazardKnowledgeDegraded(nextAgents.a_mina?.vitals)).toBe(true)
    expect(nextAgents.a_mina?.vitals?.statusFlags).toContain(
      COGNITIVE_HAZARD_KNOWLEDGE_DEGRADED_STATUS_FLAG
    )
    expect((nextAgents.a_mina?.vitals?.stress ?? 0) - priorStress).toBe(6)
  })

  it('applies duty, knowledge, and procedure flags for failed countermeasure fixture on first week', () => {
    const state = createStartingState()
    const record: CognitiveHazardExposureRecord = {
      ...COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
      subjectRef: 'agent:a_sato',
    }

    const nextAgents = applyCognitiveHazardSimulationTriggerVitalsToAgents({
      agents: state.agents,
      nextRecords: { [record.id]: record },
    })

    const vitals = nextAgents.a_sato?.vitals
    expect(vitalsHasCognitiveHazardDutyDegraded(vitals)).toBe(true)
    expect(vitalsHasCognitiveHazardKnowledgeDegraded(vitals)).toBe(true)
    expect(vitals?.statusFlags).toContain(COGNITIVE_HAZARD_PROCEDURE_RESTRICTED_STATUS_FLAG)
    expect((vitals?.morale ?? 0)).toBeLessThan(state.agents.a_sato?.vitals?.morale ?? 50)
  })

  it('strips cognitive hazard flags when triggers stop emitting', () => {
    const state = createStartingState()
    const flaggedAgents = applyCognitiveHazardSimulationTriggerVitalsToAgents({
      agents: state.agents,
      nextRecords: { [memeticFixtureForAgent('a_mina').id]: memeticFixtureForAgent('a_mina') },
    })

    expect(vitalsHasCognitiveHazardKnowledgeDegraded(flaggedAgents.a_mina?.vitals)).toBe(true)

    const clearedAgents = applyCognitiveHazardSimulationTriggerVitalsToAgents({
      agents: flaggedAgents,
      nextRecords: {
        [COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id]: COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
      },
    })

    expect(
      vitalsHasCognitiveHazardKnowledgeDegraded(clearedAgents.a_mina?.vitals)
    ).toBe(false)
  })

  it('does not re-apply vitals for terminal erased records on subsequent weeks', () => {
    const state = createStartingState()
    const record: CognitiveHazardExposureRecord = {
      ...COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
      subjectRef: 'agent:a_sato',
    }
    const firstWeek = applyCognitiveHazardSimulationTriggerVitalsToAgents({
      agents: state.agents,
      nextRecords: { [record.id]: record },
    })

    const secondWeek = applyCognitiveHazardSimulationTriggerVitalsToAgents({
      agents: firstWeek,
      nextRecords: { [record.id]: record },
      priorRecords: { [record.id]: record },
    })

    expect(vitalsHasCognitiveHazardDutyDegraded(secondWeek.a_sato?.vitals)).toBe(false)
    expect(vitalsHasCognitiveHazardKnowledgeDegraded(secondWeek.a_sato?.vitals)).toBe(false)
  })
})
