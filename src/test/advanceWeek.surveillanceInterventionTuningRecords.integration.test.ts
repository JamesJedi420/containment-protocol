import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE } from '../domain/surveillanceCapacityInterventionTuningRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { applyWeeklySurveillanceInterventionTuningTick } from '../domain/surveillanceInterventionTuningWeeklyOrchestration'
import type { SurveillanceInterventionTuningRecord } from '../domain/surveillanceCapacityInterventionTuningRegistry'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function escalationCandidateRecord(): SurveillanceInterventionTuningRecord {
  return {
    id: 'surveillance-tuning:integration-escalation',
    label: 'Integration escalation candidate',
    subjectRef: 'subject:integration-escalation',
    currentInterventionLevel: 'relaxed',
    surveillanceSignalScore: 0.72,
    meaningfulContactScore: 0.18,
    healthcareLoadScore: 0.55,
    collateralStrainScore: 0.2,
    tuningRationaleRef: 'tuning-rationale:integration-escalation',
  }
}

describe('advanceWeek surveillance intervention tuning records integration (SPE-848 slice 3)', () => {
  it('is a no-op for an empty tuning map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.surveillanceInterventionTuningRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.surveillanceInterventionTuningRecords).toEqual({})
  })

  it('advances subject-22 fixture to alternative_support through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.surveillanceInterventionTuningRecords = {
      [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const advanced =
      nextState.surveillanceInterventionTuningRecords?.[SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]

    expect(nextState.week).toBe(2)
    expect(advanced?.currentInterventionLevel).toBe('alternative_support')
    expect(advanced?.horizonOutcomes?.long).toBe('contact_recovery_signal')
  })

  it('escalates relaxed records when advanceWeek reaches a high-signal week', () => {
    const record = escalationCandidateRecord()
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.surveillanceInterventionTuningRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const advanced = nextState.surveillanceInterventionTuningRecords?.[record.id]

    expect(nextState.week).toBe(2)
    expect(advanced?.currentInterventionLevel).toBe('sustained')
    expect(advanced?.subjectRef).toBe(record.subjectRef)
  })

  it('matches direct weekly tick output inside advanceWeek', () => {
    const record = escalationCandidateRecord()
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.surveillanceInterventionTuningRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const direct = applyWeeklySurveillanceInterventionTuningTick(
      state.surveillanceInterventionTuningRecords,
      nextState.week
    )

    expect(nextState.surveillanceInterventionTuningRecords).toEqual(direct)
  })
})
