import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
  COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
  COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
} from '../domain/cognitiveHazardEngine'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { applyWeeklyCognitiveHazardExposureTick } from '../domain/cognitiveHazardWeeklyOrchestration'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek cognitive hazard exposure records integration (SPE-1309 slice 3)', () => {
  it('is a no-op for an empty exposure map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.cognitiveHazardExposureRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.cognitiveHazardExposureRecords).toEqual({})
  })

  it('advances memetic escalation fixture to compromised through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.cognitiveHazardExposureRecords = {
      [COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id]:
        COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const advanced =
      nextState.cognitiveHazardExposureRecords?.[COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id]

    expect(nextState.week).toBe(2)
    expect(advanced?.memoryImpairmentBand).toBe('compromised')
    expect(advanced?.knowledgeIntegrityDegraded).toBe(true)
    expect(advanced?.agentDutyDegraded).toBe(true)
    expect(advanced?.subjectRef).toBe(COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.subjectRef)
  })

  it('preserves failed countermeasure fixture at erased with unchanged gating flags', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.cognitiveHazardExposureRecords = {
      [COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE.id]:
        COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.cognitiveHazardExposureRecords).toEqual(state.cognitiveHazardExposureRecords)
    expect(
      nextState.cognitiveHazardExposureRecords?.[COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE.id]
        ?.agentDutyDegraded
    ).toBe(true)
    expect(
      nextState.cognitiveHazardExposureRecords?.[COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE.id]
        ?.procedureRestrictionActive
    ).toBe(true)
  })

  it('keeps stable subject fixture unchanged through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.cognitiveHazardExposureRecords = {
      [COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id]: COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.cognitiveHazardExposureRecords).toEqual(state.cognitiveHazardExposureRecords)
    expect(
      nextState.cognitiveHazardExposureRecords?.[COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id]
        ?.memoryImpairmentBand
    ).toBe('intact')
  })

  it('matches direct weekly tick output inside advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.cognitiveHazardExposureRecords = {
      [COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id]:
        COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
      [COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE.id]:
        COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const direct = applyWeeklyCognitiveHazardExposureTick(
      state.cognitiveHazardExposureRecords,
      nextState.week
    )

    expect(nextState.cognitiveHazardExposureRecords).toEqual(direct)
  })
})
