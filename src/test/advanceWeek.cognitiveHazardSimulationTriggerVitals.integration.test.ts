import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
  COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
  type CognitiveHazardExposureRecord,
} from '../domain/cognitiveHazardEngine'
import {
  vitalsHasCognitiveHazardKnowledgeDegraded,
} from '../domain/cognitiveHazardSimulationTriggerVitals'
import { applyCognitiveHazardSimulationTriggerVitalsToAgents } from '../domain/cognitiveHazardSimulationTriggerVitals'
import { advanceWeek } from '../domain/sim/advanceWeek'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function memeticFixtureForAgent(agentId: string): CognitiveHazardExposureRecord {
  return {
    ...COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
    subjectRef: `agent:${agentId}`,
  }
}

describe('advanceWeek cognitive hazard simulation trigger vitals integration (SPE-1309 slice 7)', () => {
  it('is a no-op for an empty exposure map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.cognitiveHazardExposureRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.cognitiveHazardExposureRecords).toEqual({})
    expect(
      nextState.agents.a_mina?.vitals?.statusFlags?.some((flag) =>
        flag.startsWith('cognitive_hazard:')
      )
    ).toBeFalsy()
  })

  it('applies knowledge-degraded vitals for memetic escalation fixture on first week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const record = memeticFixtureForAgent('a_mina')
    state.cognitiveHazardExposureRecords = { [record.id]: record }

    const nextState = advanceWeek(state)
    const directAgents = applyCognitiveHazardSimulationTriggerVitalsToAgents({
      agents: nextState.agents,
      nextRecords: nextState.cognitiveHazardExposureRecords ?? {},
      priorRecords: state.cognitiveHazardExposureRecords,
    })

    expect(vitalsHasCognitiveHazardKnowledgeDegraded(nextState.agents.a_mina?.vitals)).toBe(true)
    expect(nextState.agents.a_mina?.vitals?.statusFlags).toEqual(
      directAgents.a_mina?.vitals?.statusFlags
    )
  })

  it('clears cognitive hazard vitals flags when triggers stop after stable week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const record = memeticFixtureForAgent('a_mina')
    state.cognitiveHazardExposureRecords = { [record.id]: record }

    const firstWeek = advanceWeek(state)
    expect(vitalsHasCognitiveHazardKnowledgeDegraded(firstWeek.agents.a_mina?.vitals)).toBe(true)

    firstWeek.cognitiveHazardExposureRecords = {
      [COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id]: COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
    }
    const secondWeek = advanceWeek(firstWeek)
    expect(vitalsHasCognitiveHazardKnowledgeDegraded(secondWeek.agents.a_mina?.vitals)).toBe(
      false
    )
  })
})
