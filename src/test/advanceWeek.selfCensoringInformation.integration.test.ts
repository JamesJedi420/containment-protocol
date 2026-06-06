import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  REDISCOVERY_LOOP_RECORD_FIXTURE,
  STUDY_BLOCKED_ARCHIVE_FIXTURE,
} from '../domain/selfCensoringInformationRegistry'
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

describe('advanceWeek self-censoring information integration (SPE-2108 slice 3)', () => {
  it('is a no-op for an empty self-censoring information map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.selfCensoringInformationRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.selfCensoringInformationRecords).toEqual({})
  })

  it('decrements retentionDecayTimer after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 40
    state.selfCensoringInformationRecords = {
      [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: {
        ...REDISCOVERY_LOOP_RECORD_FIXTURE,
        retentionDecayTimer: 3,
      },
    }

    const nextState = advanceWeek(state)
    const record = nextState.selfCensoringInformationRecords?.[REDISCOVERY_LOOP_RECORD_FIXTURE.id]

    expect(nextState.week).toBe(41)
    expect(record?.retentionDecayTimer).toBe(2)
    expect(record?.rediscoveryLoop).toEqual({
      loopCount: 1,
      forgottenWarningRefs: ['warning:wing-c-roster-gap-38', 'warning:wing-c-roster-gap-40'],
    })
  })

  it('leaves rediscoveryLoop unchanged before the due week after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 39
    state.selfCensoringInformationRecords = {
      [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const record = nextState.selfCensoringInformationRecords?.[REDISCOVERY_LOOP_RECORD_FIXTURE.id]

    expect(nextState.week).toBe(40)
    expect(record?.rediscoveryLoop).toEqual(REDISCOVERY_LOOP_RECORD_FIXTURE.rediscoveryLoop)
    expect(record?.retentionDecayTimer).toBe(7)
  })

  it('preserves unrelated record fields byte-stable through advanceWeek tick', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 40
    state.selfCensoringInformationRecords = {
      [STUDY_BLOCKED_ARCHIVE_FIXTURE.id]: STUDY_BLOCKED_ARCHIVE_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const record = nextState.selfCensoringInformationRecords?.[STUDY_BLOCKED_ARCHIVE_FIXTURE.id]

    expect(record).toEqual(STUDY_BLOCKED_ARCHIVE_FIXTURE)
  })
})
