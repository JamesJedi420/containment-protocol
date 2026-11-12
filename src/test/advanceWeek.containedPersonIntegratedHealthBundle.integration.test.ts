import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  MISSED_STREAK_ELEVATED_RISK_FIXTURE,
  WEEKLY_PSYCH_SCREENING_FIXTURE,
} from '../domain/containedPersonTherapeuticCareRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { deriveTherapeuticCareBundleFragmentsFromRecords } from '../domain/containedPersonTherapeuticCareHealthBundleLinks'
import { composeTherapeuticCareIntoIntegratedHealthBundles } from '../domain/containedPersonIntegratedHealthBundleCompose'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek contained-person integrated health bundle integration (SPE-1889 slice 5)', () => {
  it('is a no-op for empty therapeutic care and bundle maps without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.containedPersonTherapeuticCareRecords = {}
    state.containedPersonIntegratedHealthBundles = {}

    const nextState = advanceWeek(state)

    expect(nextState.containedPersonIntegratedHealthBundles ?? {}).toEqual({})
  })

  it('composes integrated health bundles from therapeutic care records after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.containedPersonTherapeuticCareRecords = {
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
      [MISSED_STREAK_ELEVATED_RISK_FIXTURE.id]: MISSED_STREAK_ELEVATED_RISK_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const bundles = nextState.containedPersonIntegratedHealthBundles ?? {}

    expect(Object.keys(bundles)).toEqual([
      WEEKLY_PSYCH_SCREENING_FIXTURE.subjectRef,
      MISSED_STREAK_ELEVATED_RISK_FIXTURE.subjectRef,
    ])

    const driftBundle = bundles[MISSED_STREAK_ELEVATED_RISK_FIXTURE.subjectRef]
    expect(driftBundle?.mentalStateBand).toBe('critical')
    expect(driftBundle?.therapeuticCareScheduleLinks?.[0]?.missedSessionStreak).toBe(3)
  })

  it('updates bundle mental-state markers when therapeutic care tick advances streak', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 1
    state.containedPersonTherapeuticCareRecords = {
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: {
        ...WEEKLY_PSYCH_SCREENING_FIXTURE,
        missedSessionStreak: 1,
      },
    }

    const nextState = advanceWeek(state)
    const bundle = nextState.containedPersonIntegratedHealthBundles?.[
      WEEKLY_PSYCH_SCREENING_FIXTURE.subjectRef
    ]

    expect(nextState.containedPersonTherapeuticCareRecords?.[WEEKLY_PSYCH_SCREENING_FIXTURE.id]
      ?.missedSessionStreak).toBe(2)
    expect(bundle?.therapeuticCareScheduleLinks?.[0]?.missedSessionStreak).toBe(2)
    expect(bundle?.therapeuticCareScheduleLinks?.[0]?.channelState).toBe('degraded')
  })

  it('matches standalone derive + compose output for the same hydrated care map', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.containedPersonTherapeuticCareRecords = {
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const fragments = deriveTherapeuticCareBundleFragmentsFromRecords(
      nextState.containedPersonTherapeuticCareRecords
    )
    const composed = composeTherapeuticCareIntoIntegratedHealthBundles({}, fragments)

    expect(nextState.containedPersonIntegratedHealthBundles).toEqual(composed)
  })
})
