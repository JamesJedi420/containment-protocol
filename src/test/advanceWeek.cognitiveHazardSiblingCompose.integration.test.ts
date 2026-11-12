import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
  type CognitiveHazardExposureRecord,
} from '../domain/cognitiveHazardEngine'
import { composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords } from '../domain/cognitiveHazardSiblingCompose'
import { applyWeeklyCognitiveHazardExposureTick } from '../domain/cognitiveHazardWeeklyOrchestration'
import { REDISCOVERY_LOOP_RECORD_FIXTURE } from '../domain/selfCensoringInformationRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'

const LINKED_EXPOSURE_FIXTURE: CognitiveHazardExposureRecord = Object.freeze({
  ...COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
  id: 'cognitive-hazard:linked-roster-audit-exposure',
  subjectRef: 'case:facility-roster-audit-12',
  activeTriggerChannels: Object.freeze(['reference_description'] as const),
})

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek cognitive hazard sibling compose integration (SPE-1309 slice 4)', () => {
  it('is a no-op when sibling map is empty without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.cognitiveHazardExposureRecords = {
      [LINKED_EXPOSURE_FIXTURE.id]: LINKED_EXPOSURE_FIXTURE,
    }
    state.selfCensoringInformationRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.cognitiveHazardExposureRecords?.[LINKED_EXPOSURE_FIXTURE.id]).toEqual(
      expect.objectContaining({
        activeTriggerChannels: ['reference_description'],
      })
    )
  })

  it('merges sibling propagation tags into linked exposure channels through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.cognitiveHazardExposureRecords = {
      [LINKED_EXPOSURE_FIXTURE.id]: LINKED_EXPOSURE_FIXTURE,
    }
    state.selfCensoringInformationRecords = {
      [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const advanced = nextState.cognitiveHazardExposureRecords?.[LINKED_EXPOSURE_FIXTURE.id]

    expect(advanced?.activeTriggerChannels).toEqual([
      'memory_interaction',
      'recording_mediated',
      'reference_description',
    ])
    expect(advanced?.memoryImpairmentBand).toBe('compromised')
    expect(advanced?.subjectRef).toBe(LINKED_EXPOSURE_FIXTURE.subjectRef)
  })

  it('matches direct compose then weekly tick output inside advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.cognitiveHazardExposureRecords = {
      [LINKED_EXPOSURE_FIXTURE.id]: LINKED_EXPOSURE_FIXTURE,
    }
    state.selfCensoringInformationRecords = {
      [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const composed = composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords(
      state.cognitiveHazardExposureRecords,
      state.selfCensoringInformationRecords
    )
    const direct = applyWeeklyCognitiveHazardExposureTick(composed, nextState.week)

    expect(nextState.cognitiveHazardExposureRecords).toEqual(direct)
  })
})
