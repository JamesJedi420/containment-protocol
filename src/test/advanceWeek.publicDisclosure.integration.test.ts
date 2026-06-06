import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  DISCLOSURE_PROGRESSION_FIXTURE,
  NORMALIZATION_INPUT_FIXTURE,
  type PublicDisclosureRecord,
} from '../domain/publicDisclosureStateRegistry'
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

function scheduledRecord(): PublicDisclosureRecord {
  return {
    id: 'disclosure:advance-week-scheduled',
    label: 'Advance week scheduled disclosure record',
    awarenessLevel: 'credible_leak',
    falloutPhase: 'leak',
    trustByRegion: [{ regionRef: 'region:coastal-metro', trustScore: 0.42 }],
    transitionHistory: [
      {
        fromAwarenessLevel: 'secrecy_intact',
        toAwarenessLevel: 'credible_leak',
        week: 18,
        falloutPhase: 'leak',
      },
      {
        fromAwarenessLevel: 'credible_leak',
        toAwarenessLevel: 'public_scandal',
        week: 25,
        falloutPhase: 'disclosure',
      },
    ],
  }
}

describe('advanceWeek public disclosure integration (SPE-2109 slice 3)', () => {
  it('is a no-op for an empty public disclosure map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.publicDisclosureRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.publicDisclosureRecords).toEqual({})
  })

  it('applies scheduled transition after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 24
    const record = scheduledRecord()
    state.publicDisclosureRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.publicDisclosureRecords?.[record.id]

    expect(nextState.week).toBe(25)
    expect(nextRecord?.awarenessLevel).toBe('public_scandal')
    expect(nextRecord?.falloutPhase).toBe('disclosure')
    expect(nextRecord?.transitionHistory).toEqual(record.transitionHistory)
    expect(nextRecord?.trustByRegion).toEqual(record.trustByRegion)
  })

  it('leaves scheduled transition unchanged before the due week after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 23
    const record = scheduledRecord()
    state.publicDisclosureRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.publicDisclosureRecords?.[record.id]

    expect(nextState.week).toBe(24)
    expect(nextRecord?.awarenessLevel).toBe('credible_leak')
    expect(nextRecord?.falloutPhase).toBe('leak')
  })

  it('preserves synced progression fixture byte-stable through advanceWeek tick', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 30
    state.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const record = nextState.publicDisclosureRecords?.[DISCLOSURE_PROGRESSION_FIXTURE.id]

    expect(record).toEqual(DISCLOSURE_PROGRESSION_FIXTURE)
  })

  it('preserves normalization fixture byte-stable through advanceWeek tick', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 12
    state.publicDisclosureRecords = {
      [NORMALIZATION_INPUT_FIXTURE.id]: NORMALIZATION_INPUT_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const record = nextState.publicDisclosureRecords?.[NORMALIZATION_INPUT_FIXTURE.id]

    expect(record).toEqual(NORMALIZATION_INPUT_FIXTURE)
  })
})
