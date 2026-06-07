import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
  TRANSFER_PENDING_REVIEW_FIXTURE,
} from '../domain/containedPersonCustodyStatusRegistry'
import { VOLUNTARY_STABILIZER_REGIMEN_FIXTURE } from '../domain/containedPersonMedicationRegimenRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { deriveCustodyStatusBundleFragmentsFromRecords } from '../domain/containedPersonCustodyStatusHealthBundleLinks'
import { composeCustodyStatusIntoIntegratedHealthBundles } from '../domain/containedPersonIntegratedHealthBundleCompose'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek contained-person integrated health bundle custody integration (SPE-1889 slice 9)', () => {
  it('is a no-op for empty custody status and bundle maps without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.containedPersonCustodyStatusRecords = {}
    state.containedPersonIntegratedHealthBundles = {}

    const nextState = advanceWeek(state)

    expect(nextState.containedPersonIntegratedHealthBundles ?? {}).toEqual({})
  })

  it('composes integrated health bundles from custody status records after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.containedPersonCustodyStatusRecords = {
      [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
      [TRANSFER_PENDING_REVIEW_FIXTURE.id]: TRANSFER_PENDING_REVIEW_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const bundles = nextState.containedPersonIntegratedHealthBundles ?? {}

    expect(Object.keys(bundles)).toEqual([
      HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.subjectRef,
      TRANSFER_PENDING_REVIEW_FIXTURE.subjectRef,
    ])

    const hostileBundle = bundles[HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.subjectRef]
    expect(hostileBundle?.custodyStatusLinks?.[0]?.custodyStage).toBe('contained_person')
    expect(hostileBundle?.custodyStatusLinks?.[0]?.rightsReviewPending).toBe(true)
  })

  it('matches standalone derive + compose output for the same hydrated custody map', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.containedPersonCustodyStatusRecords = {
      [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const fragments = deriveCustodyStatusBundleFragmentsFromRecords(
      nextState.containedPersonCustodyStatusRecords
    )
    const composed = composeCustodyStatusIntoIntegratedHealthBundles({}, fragments)

    expect(
      nextState.containedPersonIntegratedHealthBundles?.[
        HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.subjectRef
      ]?.custodyStatusLinks
    ).toEqual(
      composed[HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.subjectRef]?.custodyStatusLinks
    )
  })

  it('leaves medication regimen compose behavior unchanged when custody map is empty', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.containedPersonCustodyStatusRecords = {}
    state.containedPersonMedicationRegimenRecords = {
      [VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.id]: VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const bundle = nextState.containedPersonIntegratedHealthBundles?.[
      VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.subjectRef
    ]

    expect(bundle?.medicationRegimenLinks).toHaveLength(1)
    expect(bundle?.custodyStatusLinks).toBeUndefined()
  })
})
